import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener TODAS las órdenes
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    console.log(`Total de órdenes: ${allOrders.length}`);

    // Separar en dos grupos
    const todayOrders = [];
    const pastOrders = [];
    
    allOrders.forEach(o => {
      if (o.created_date && o.created_date.startsWith('2026-05-14')) {
        todayOrders.push(o);
      } else {
        pastOrders.push(o);
      }
    });

    console.log(`Órdenes de hoy (2026-05-14): ${todayOrders.length}`);
    console.log(`Órdenes del pasado: ${pastOrders.length}`);

    // Eliminar TODAS las de hoy
    const deleted = [];
    const errors = [];

    for (const order of todayOrders) {
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted.push(order.order_number);
      } catch (err) {
        errors.push({
          order: order.order_number,
          error: err.message,
        });
      }
    }

    console.log(`Eliminadas: ${deleted.length}, Errores: ${errors.length}`);

    return Response.json({
      past_orders_kept: pastOrders.length,
      today_orders_deleted: deleted.length,
      errors: errors.length,
      deleted_orders: deleted,
      error_details: errors.slice(0, 5),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});