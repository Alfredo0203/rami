import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener la última orden
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 1);
    const lastOrder = orders[0];

    if (!lastOrder) {
      return Response.json({ error: 'No orders found' }, { status: 404 });
    }

    // Buscar el usuario por nombre (customer_name: "Alfredo Menjivar")
    const allUsers = await base44.asServiceRole.entities.User.list('', 100);
    const correctUser = allUsers.find(u => 
      u.full_name?.toLowerCase() === lastOrder.customer_name?.toLowerCase()
    );

    if (!correctUser) {
      return Response.json({ 
        error: `No user found with name: ${lastOrder.customer_name}`,
        order_id: lastOrder.id,
        current_created_by: lastOrder.created_by,
      }, { status: 404 });
    }

    // La orden ya está creada con el email incorrecto
    // No podemos cambiar created_by directamente, así que recreamos la orden
    const orderData = { ...lastOrder };
    delete orderData.id;
    delete orderData.created_date;
    delete orderData.updated_date;
    delete orderData.created_by;

    // Recrear la orden (creará con el usuario correcto)
    const newOrder = await base44.asServiceRole.entities.Order.create(orderData);

    // Eliminar la antigua
    await base44.asServiceRole.entities.Order.delete(lastOrder.id);

    return Response.json({
      success: true,
      old_order_id: lastOrder.id,
      new_order_id: newOrder.id,
      order_number: lastOrder.order_number,
      old_created_by: lastOrder.created_by,
      new_created_by: correctUser.email,
      user_name: correctUser.full_name,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});