import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todos los usuarios para encontrar a Alfredo
    const allUsers = await base44.asServiceRole.entities.User.list('', 100);
    const alfredo = allUsers.find(u => u.full_name?.includes('Alfredo'));

    if (!alfredo) {
      return Response.json({ 
        error: 'Alfredo not found',
        available_users: allUsers.map(u => ({ id: u.id, name: u.full_name, email: u.email }))
      });
    }

    // Obtener todas las órdenes de Alfredo
    const alfredoOrders = await base44.asServiceRole.entities.Order.filter({
      created_by: alfredo.email
    }, '-created_date', 100);

    return Response.json({
      user: {
        id: alfredo.id,
        name: alfredo.full_name,
        email: alfredo.email,
      },
      orders_count: alfredoOrders.length,
      orders: alfredoOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        created_by: o.created_by,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        total: o.total,
        status: o.status,
        created_date: o.created_date,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});