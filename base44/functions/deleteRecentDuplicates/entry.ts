import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener TODAS las órdenes
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    // Agrupar por order_number
    const byNumber = {};
    allOrders.forEach(o => {
      if (!byNumber[o.order_number]) {
        byNumber[o.order_number] = [];
      }
      byNumber[o.order_number].push(o);
    });

    const toDelete = [];
    const deleted = [];
    const errors = [];

    // Para cada grupo de duplicados
    for (const [orderNumber, orders] of Object.entries(byNumber)) {
      if (orders.length > 1) {
        // Mantener la más antigua, eliminar las nuevas (las del 2026-05-14)
        const sorted = orders.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const keepId = sorted[0].id;
        
        // Las demás son para eliminar
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push(sorted[i]);
        }
      }
    }

    console.log(`Encontrados ${toDelete.length} órdenes duplicadas para eliminar`);

    // Eliminar
    for (const order of toDelete) {
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted.push({
          id: order.id,
          order_number: order.order_number,
          created_date: order.created_date,
          customer_name: order.customer_name,
        });
      } catch (err) {
        console.error(`Error deleting ${order.order_number}:`, err.message);
        errors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: err.message,
        });
      }
    }

    return Response.json({
      total_before: allOrders.length,
      duplicates_found: toDelete.length,
      deleted_count: deleted.length,
      errors_count: errors.length,
      deleted_sample: deleted.slice(0, 10),
      errors_sample: errors.slice(0, 5),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});