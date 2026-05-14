import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 100);
    
    // Filtrar órdenes con emails del sistema o "Alfredo Menjivar" sin el email correcto
    const problematicOrders = allOrders.filter(o => 
      (o.customer_name === 'Alfredo Menjivar' && o.created_by !== 'alfredo199870@gmail.com') ||
      o.created_by?.includes('no-reply.base44.com')
    );

    return Response.json({
      total_orders: allOrders.length,
      problematic_count: problematicOrders.length,
      problematic_orders: problematicOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        created_by: o.created_by,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        total: o.total,
        created_date: o.created_date,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});