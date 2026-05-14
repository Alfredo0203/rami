import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener últimas 10 órdenes
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 10);
    
    // Contar por created_by
    const byCreatedBy = {};
    allOrders.forEach(o => {
      const creator = o.created_by?.split('@')[0] || 'unknown';
      byCreatedBy[creator] = (byCreatedBy[creator] || 0) + 1;
    });

    // Obtener usuarios únicos
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Órdenes por usuario
    const ordersByUser = {};
    for (const user of allUsers) {
      const userOrders = await base44.asServiceRole.entities.Order.filter({ created_by: user.email });
      if (userOrders.length > 0) {
        ordersByUser[user.email] = {
          name: user.full_name,
          count: userOrders.length,
          lastOrder: userOrders[0],
        };
      }
    }

    return Response.json({
      total_orders: await base44.asServiceRole.entities.Order.list(),
      recent_10: allOrders.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        created_by: o.created_by,
        created_date: o.created_date,
        total: o.total,
      })),
      by_created_by: byCreatedBy,
      orders_by_user: ordersByUser,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});