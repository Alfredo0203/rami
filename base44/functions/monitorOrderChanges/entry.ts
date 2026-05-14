import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener órdenes recientes
    const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 20);
    
    // Obtener historial de estado de órdenes
    const orderHistory = await base44.asServiceRole.entities.OrderStatusHistory.list('-created_date', 100);

    return Response.json({
      recent_orders_count: recentOrders.length,
      recent_orders: recentOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        created_date: o.created_date,
        status: o.status,
        customer_name: o.customer_name
      })),
      order_history_count: orderHistory.length,
      recent_status_changes: orderHistory.slice(0, 10).map(h => ({
        order_id: h.order_id,
        status: h.status,
        timestamp: h.timestamp,
        notes: h.notes
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});