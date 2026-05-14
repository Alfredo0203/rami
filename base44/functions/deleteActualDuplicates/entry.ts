import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener las órdenes creadas hoy
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    const todayOrders = allOrders.filter(o => 
      o.created_date && o.created_date.startsWith('2026-05-14')
    );

    // Agrupar por order_number
    const byNumber = {};
    todayOrders.forEach(o => {
      if (!byNumber[o.order_number]) {
        byNumber[o.order_number] = [];
      }
      byNumber[o.order_number].push(o);
    });

    // Encontrar duplicados para eliminar
    const toDelete = [];
    
    for (const [orderNumber, orders] of Object.entries(byNumber)) {
      if (orders.length > 1) {
        const sorted = orders.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push(sorted[i]);
        }
      }
    }

    console.log(`Total de duplicados para eliminar: ${toDelete.length}`);

    const deleted = [];
    const errors = [];

    // Eliminar
    for (const order of toDelete) {
      try {
        console.log(`Eliminando ${order.order_number} (${order.id})`);
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted.push({
          order_number: order.order_number,
          id: order.id,
        });
      } catch (err) {
        console.error(`Error: ${err.message}`);
        errors.push({
          order_number: order.order_number,
          id: order.id,
          error: err.message,
        });
      }
    }

    return Response.json({
      total_to_delete: toDelete.length,
      deleted_count: deleted.length,
      errors_count: errors.length,
      deleted,
      errors,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});