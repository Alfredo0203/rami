import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    // Obtener todos los usuarios
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    
    // Crear mapa de usuarios por email para búsqueda rápida
    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.email] = u;
    });

    // Analizar órdenes por customer_name
    const ordersByCustomer = {};
    allOrders.forEach(o => {
      const customerName = o.customer_name || 'Unknown';
      if (!ordersByCustomer[customerName]) {
        ordersByCustomer[customerName] = [];
      }
      ordersByCustomer[customerName].push({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_email: o.shipping_address?.phone || 'unknown', // Placeholder
        created_date: o.created_date,
        total: o.total
      });
    });

    return Response.json({
      total_orders: allOrders.length,
      total_users: allUsers.length,
      customers_with_orders: Object.keys(ordersByCustomer).length,
      sample_customers: Object.keys(ordersByCustomer).slice(0, 5).map(name => ({
        name,
        order_count: ordersByCustomer[name].length,
        orders: ordersByCustomer[name].slice(0, 2)
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});