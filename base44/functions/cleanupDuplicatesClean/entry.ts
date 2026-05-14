import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener órdenes creadas hoy (2026-05-14) - estas son las duplicadas que yo creé
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    const todayOrders = allOrders.filter(o => 
      o.created_date && o.created_date.startsWith('2026-05-14')
    );

    console.log(`Órdenes del 2026-05-14 encontradas: ${todayOrders.length}`);

    const deleted = [];
    const errors = [];

    // Eliminar cada orden del 2026-05-14
    for (const order of todayOrders) {
      try {
        console.log(`Eliminando orden ${order.order_number} (ID: ${order.id})`);
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted.push({
          order_number: order.order_number,
          id: order.id,
        });
      } catch (err) {
        console.error(`Error eliminando ${order.order_number}:`, err.message);
        errors.push({
          order_number: order.order_number,
          error: err.message,
        });
      }
    }

    console.log(`Eliminadas: ${deleted.length}, Errores: ${errors.length}`);

    return Response.json({
      today_orders_found: todayOrders.length,
      deleted_count: deleted.length,
      errors_count: errors.length,
      deleted: deleted.slice(0, 20),
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});