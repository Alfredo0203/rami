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
    
    console.log(`Total de órdenes en el sistema: ${allOrders.length}`);
    
    // Agrupar por customer_name y order_number
    const byNumber = {};
    const byCustomer = {};
    
    allOrders.forEach(o => {
      if (!byNumber[o.order_number]) {
        byNumber[o.order_number] = [];
      }
      byNumber[o.order_number].push({
        id: o.id,
        created_by: o.created_by,
        created_date: o.created_date,
        total: o.total,
      });
      
      if (!byCustomer[o.customer_name]) {
        byCustomer[o.customer_name] = [];
      }
      byCustomer[o.customer_name].push({
        id: o.id,
        order_number: o.order_number,
        created_by: o.created_by,
        created_date: o.created_date,
      });
    });

    // Encontrar duplicados
    const duplicates = Object.entries(byNumber).filter(([_, orders]) => orders.length > 1);
    
    return Response.json({
      total_orders: allOrders.length,
      duplicate_order_numbers: duplicates.length,
      duplicates_detail: duplicates.slice(0, 5).map(([num, orders]) => ({
        order_number: num,
        count: orders.length,
        instances: orders,
      })),
      alfredo_orders: byCustomer['Alfredo Menjivar'] || [],
      alfredo_torres_orders: byCustomer['Alfredo  Torres'] || [],
      all_customers: Object.keys(byCustomer).slice(0, 20),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});