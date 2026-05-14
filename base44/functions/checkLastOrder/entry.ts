import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener la última orden (ordenada por created_date descendente)
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 1);
    
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'No orders found' }, { status: 404 });
    }

    const lastOrder = orders[0];

    return Response.json({
      order_id: lastOrder.id,
      order_number: lastOrder.order_number,
      created_by: lastOrder.created_by,
      customer_email: lastOrder.customer_email,
      customer_name: lastOrder.customer_name,
      created_date: lastOrder.created_date,
      status: lastOrder.status,
      total: lastOrder.total,
      items_count: lastOrder.items?.length || 0,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});