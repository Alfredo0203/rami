import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    const todayOrders = allOrders.filter(o => o.created_date?.startsWith('2026-05-14'));
    const pastOrders = allOrders.filter(o => !o.created_date?.startsWith('2026-05-14'));

    // Crear mapa de órdenes del pasado
    const pastMap = {};
    pastOrders.forEach(o => {
      pastMap[o.order_number] = o;
    });

    // Identificar duplicados
    const toDelete = [];
    todayOrders.forEach(today => {
      if (pastMap[today.order_number]) {
        const past = pastMap[today.order_number];
        if (JSON.stringify(today.items) === JSON.stringify(past.items) && 
            today.total === past.total) {
          toDelete.push(today.id);
        }
      }
    });

    console.log(`Eliminando ${toDelete.length} duplicados...`);

    const deleted = [];
    const errors = [];

    for (const id of toDelete) {
      try {
        await base44.asServiceRole.entities.Order.delete(id);
        deleted.push(id);
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    return Response.json({
      deleted: deleted.length,
      errors: errors.length,
      remaining_orders: (todayOrders.length - deleted.length) + pastOrders.length,
      error_details: errors.slice(0, 5)
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});