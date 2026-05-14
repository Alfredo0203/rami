import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes
    const orders = await base44.asServiceRole.entities.Order.list();
    
    // Obtener todos los usuarios
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = Object.fromEntries(allUsers.map(u => [u.full_name?.toLowerCase(), u.email]));

    let updated = 0;
    const errors = [];

    // Actualizar órdenes sin user_email
    for (const order of orders) {
      if (order.user_email) continue; // Ya tiene email

      let emailToAssign = null;

      // Intentar matchear por customer_name
      if (order.customer_name) {
        emailToAssign = userMap[order.customer_name.toLowerCase()];
      }

      // Si no encuentra, asignar admin como fallback
      if (!emailToAssign) {
        emailToAssign = allUsers.find(u => u.role === 'admin')?.email || user.email;
      }

      try {
        await base44.asServiceRole.entities.Order.update(order.id, { user_email: emailToAssign });
        updated++;
      } catch (e) {
        errors.push({ orderId: order.id, error: e.message });
      }
    }

    return Response.json({ 
      total_orders: orders.length,
      updated,
      errors,
      message: `${updated}/${orders.length} órdenes actualizadas con email`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});