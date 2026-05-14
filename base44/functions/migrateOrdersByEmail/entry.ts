import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica que todas las órdenes tengan created_by correctamente asignado.
 * Solo reporta - no modifica nada.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orders = await base44.asServiceRole.entities.Order.list('', 1000);
    
    const withoutCreatedBy = [];
    const valid = [];

    for (const order of orders) {
      if (!order.created_by || order.created_by.trim() === '') {
        withoutCreatedBy.push({
          id: order.id,
          order_number: order.order_number,
          customer_email: order.customer_email,
        });
      } else {
        valid.push(order.id);
      }
    }

    return Response.json({
      total: orders.length,
      valid_with_created_by: valid.length,
      missing_created_by: withoutCreatedBy.length,
      issues: withoutCreatedBy,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});