import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener las órdenes creadas hoy con IDs REALES
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

    // Encontrar duplicados para eliminar (mantener el más antiguo en cada grupo)
    const toDelete = [];
    
    for (const [orderNumber, orders] of Object.entries(byNumber)) {
      if (orders.length > 1) {
        // Ordenar por fecha
        const sorted = orders.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        // Mantener el primero, eliminar los demás
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push({
            id: sorted[i].id,
            order_number: sorted[i].order_number,
            created_date: sorted[i].created_date,
          });
        }
      }
    }

    return Response.json({
      total_today: todayOrders.length,
      unique_order_numbers: Object.keys(byNumber).length,
      duplicates_to_delete: toDelete.length,
      to_delete_sample: toDelete.slice(0, 15),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});