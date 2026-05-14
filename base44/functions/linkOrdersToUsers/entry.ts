import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes y usuarios
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Crear mapa de usuarios por nombre completo (aproximado)
    const usersByName = {};
    allUsers.forEach(u => {
      const nameParts = u.full_name?.split(' ') || [];
      usersByName[u.full_name?.toLowerCase()] = u.email;
      if (nameParts.length > 0) {
        usersByName[nameParts[0]?.toLowerCase()] = u.email;
      }
    });

    const updated = [];
    const errors = [];

    // Actualizar cada orden
    for (const order of allOrders) {
      try {
        const customerName = order.customer_name?.toLowerCase() || '';
        let ownerEmail = usersByName[customerName];

        // Si no encuentra por nombre completo, buscar por primera palabra
        if (!ownerEmail && customerName) {
          const firstWord = customerName.split(' ')[0];
          ownerEmail = usersByName[firstWord];
        }

        // Si todavía no encuentra, dejar sin asignar
        if (!ownerEmail) {
          ownerEmail = 'unassigned@system.local';
        }

        await base44.asServiceRole.entities.Order.update(order.id, {
          user_email: ownerEmail
        });

        updated.push({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          assigned_to: ownerEmail
        });
      } catch (err) {
        errors.push({
          id: order.id,
          order_number: order.order_number,
          error: err.message
        });
      }
    }

    return Response.json({
      total_orders: allOrders.length,
      updated: updated.length,
      errors: errors.length,
      samples: updated.slice(0, 5),
      error_samples: errors.slice(0, 3)
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});