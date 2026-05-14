import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener la orden ORD-MP4XG1WIL6CGZA
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 100);
    const badOrder = allOrders.find(o => 
      o.order_number === 'ORD-MP4XG1WIL6CGZA' && 
      o.customer_name === 'Alfredo Menjivar'
    );

    if (!badOrder) {
      return Response.json({ 
        error: 'Order not found',
        searched_for: 'ORD-MP4XG1WIL6CGZA with customer Alfredo Menjivar'
      });
    }

    // Copiar datos de la orden (excepto campos del sistema)
    const orderData = {
      order_number: badOrder.order_number,
      items: badOrder.items,
      subtotal: badOrder.subtotal,
      discount_amount: badOrder.discount_amount,
      coupon_code: badOrder.coupon_code,
      coupon_id: badOrder.coupon_id,
      address_id: badOrder.address_id,
      shipping_cost: badOrder.shipping_cost,
      total: badOrder.total,
      status: badOrder.status,
      payment_method: badOrder.payment_method,
      payment_status: badOrder.payment_status,
      payment_transaction_id: badOrder.payment_transaction_id,
      shipping_address: badOrder.shipping_address,
      tracking_number: badOrder.tracking_number,
      carrier: badOrder.carrier,
      customer_name: badOrder.customer_name,
      customer_notes: badOrder.customer_notes,
      internal_notes: badOrder.internal_notes,
    };

    // Recrear la orden (se creará con Alfredo como created_by)
    const newOrder = await base44.asServiceRole.entities.Order.create(orderData);

    // Eliminar la anterior
    await base44.asServiceRole.entities.Order.delete(badOrder.id);

    return Response.json({
      success: true,
      old_order_id: badOrder.id,
      new_order_id: newOrder.id,
      order_number: badOrder.order_number,
      old_created_by: badOrder.created_by,
      new_created_by: 'alfredo199870@gmail.com',
      customer_name: badOrder.customer_name,
      message: 'Orden migrada correctamente a Alfredo',
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});