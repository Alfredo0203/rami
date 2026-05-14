import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 1000);
    
    // Filtrar órdenes con email del sistema (estas son las malas/duplicadas)
    const badOrders = allOrders.filter(o => 
      o.created_by?.includes('no-reply.base44.com')
    );

    const deleted = [];
    const errors = [];

    for (const order of badOrders) {
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted.push({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total: order.total,
        });
      } catch (err) {
        console.error(`Error deleting order ${order.order_number}:`, err.message);
        errors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: err.message,
        });
      }
    }

    return Response.json({
      total_bad_orders: badOrders.length,
      deleted_count: deleted.length,
      errors_count: errors.length,
      deleted: deleted.slice(0, 5),
      errors,
      message: `${deleted.length} órdenes duplicadas eliminadas`,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});