import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar y eliminar ORD-TEST-001
    const testOrders = await base44.asServiceRole.entities.Order.filter({ order_number: 'ORD-TEST-001' });
    
    if (testOrders.length === 0) {
      return Response.json({ message: 'No test orders found' });
    }

    for (const order of testOrders) {
      await base44.asServiceRole.entities.Order.delete(order.id);
    }

    return Response.json({ deleted: testOrders.length });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});