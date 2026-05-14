import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 1000);
    
    // Filtrar órdenes con email del sistema
    const problematicOrders = allOrders.filter(o => 
      o.created_by?.includes('no-reply.base44.com')
    );

    const corrected = [];
    const errors = [];

    for (const order of problematicOrders) {
      try {
        // Copiar datos (sin campos de sistema)
        const orderData = {
          order_number: order.order_number,
          items: order.items,
          subtotal: order.subtotal,
          discount_amount: order.discount_amount,
          coupon_code: order.coupon_code,
          coupon_id: order.coupon_id,
          address_id: order.address_id,
          shipping_cost: order.shipping_cost,
          total: order.total,
          status: order.status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          payment_transaction_id: order.payment_transaction_id,
          shipping_address: order.shipping_address,
          tracking_number: order.tracking_number,
          carrier: order.carrier,
          customer_name: order.customer_name,
          customer_notes: order.customer_notes,
          internal_notes: order.internal_notes,
        };

        // Recrear con el usuario correcto (usa customer_email)
        const newOrder = await base44.asServiceRole.entities.Order.create(orderData);

        // Eliminar la anterior
        await base44.asServiceRole.entities.Order.delete(order.id);

        corrected.push({
          old_id: order.id,
          new_id: newOrder.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          status: 'fixed',
        });
      } catch (err) {
        console.error(`Error fixing order ${order.order_number}:`, err);
        errors.push({
          order_id: order.id,
          order_number: order.order_number,
          error: err.message,
        });
      }
    }

    return Response.json({
      total_problematic: problematicOrders.length,
      corrected_count: corrected.length,
      errors_count: errors.length,
      corrected: corrected.slice(0, 10), // mostrar primeros 10
      errors,
      message: `${corrected.length} órdenes corregidas de ${problematicOrders.length}`,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});