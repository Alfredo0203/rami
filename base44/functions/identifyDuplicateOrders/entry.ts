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

    console.log(`Hoy: ${todayOrders.length}, Pasado: ${pastOrders.length}`);

    // Crear mapa de órdenes del pasado por order_number
    const pastMap = {};
    pastOrders.forEach(o => {
      pastMap[o.order_number] = o;
    });

    // Buscar duplicados (mismo order_number en hoy y pasado)
    const actualDuplicates = [];
    const newOrders = [];

    todayOrders.forEach(today => {
      if (pastMap[today.order_number]) {
        // Mismo número de orden existe en pasado
        const past = pastMap[today.order_number];
        if (JSON.stringify(today.items) === JSON.stringify(past.items) && 
            today.total === past.total) {
          actualDuplicates.push({
            order_number: today.order_number,
            today_id: today.id,
            past_id: past.id,
            total: today.total
          });
        } else {
          newOrders.push(today.order_number);
        }
      } else {
        newOrders.push(today.order_number);
      }
    });

    return Response.json({
      total_today: todayOrders.length,
      total_past: pastOrders.length,
      actual_duplicates: actualDuplicates.length,
      truly_new_orders: newOrders.length,
      duplicate_details: actualDuplicates.slice(0, 10),
      recommendation: actualDuplicates.length > 0 ? 
        `Elimina los ${actualDuplicates.length} duplicados de hoy` : 
        `Las ${newOrders.length} órdenes de hoy son NUEVAS, no elimines`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});