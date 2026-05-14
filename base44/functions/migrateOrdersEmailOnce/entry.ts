import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes (sin paginación)
    const allOrders = [];
    let offset = 0;
    let batch;
    do {
      batch = await base44.asServiceRole.entities.Order.list();
      if (batch.length === 0) break;
      allOrders.push(...batch);
      offset += batch.length;
    } while (batch.length > 0);

    // Obtener todos los usuarios
    const allUsers = await base44.asServiceRole.entities.User.list();

    let updated = 0;
    const errors = [];
    const updated_orders = [];

    // Actualizar órdenes sin user_email
    for (const order of allOrders) {
      if (order.user_email) continue; // Ya tiene email

      let emailToAssign = null;

      // Intentar matchear por customer_name
      if (order.customer_name) {
        const foundUser = allUsers.find(u => u.full_name?.toLowerCase() === order.customer_name.toLowerCase());
        if (foundUser) {
          emailToAssign = foundUser.email;
        }
      }

      // Si no encuentra, asignar admin como fallback
      if (!emailToAssign) {
        const adminUser = allUsers.find(u => u.role === 'admin');
        emailToAssign = adminUser?.email || user.email;
      }

      try {
        await base44.asServiceRole.entities.Order.update(order.id, { user_email: emailToAssign });
        updated++;
        updated_orders.push({ orderId: order.id, customer_name: order.customer_name, assigned_email: emailToAssign });
      } catch (e) {
        errors.push({ orderId: order.id, customer_name: order.customer_name, error: e.message });
      }
    }

    return Response.json({ 
      total_orders: allOrders.length,
      updated,
      errors,
      updated_orders,
      message: `${updated}/${allOrders.length} órdenes actualizadas con email`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});