import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    
    console.log(`Total órdenes: ${allOrders.length}`);

    // Agrupar por fecha
    const byDate = {};
    allOrders.forEach(o => {
      const date = o.created_date?.split('T')[0] || 'unknown';
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(o);
    });

    // Agrupar por order_number para ver duplicados
    const byNumber = {};
    allOrders.forEach(o => {
      if (!byNumber[o.order_number]) {
        byNumber[o.order_number] = [];
      }
      byNumber[o.order_number].push(o);
    });

    const duplicates = Object.entries(byNumber).filter(([_, orders]) => orders.length > 1);
    
    return Response.json({
      total_orders: allOrders.length,
      orders_by_date: byDate,
      duplicate_order_numbers: duplicates.length,
      sample_duplicates: duplicates.slice(0, 3).map(([num, orders]) => ({
        number: num,
        count: orders.length,
        ids: orders.map(o => o.id)
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});