import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const base44 = createClientFromRequest(req);

  // Validar firma de Stripe
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    console.error('Webhook: no order_id en metadata');
    return Response.json({ received: true });
  }

  try {
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      console.error('Webhook: orden no encontrada', orderId);
      return Response.json({ received: true });
    }

    // Si ya fue procesada, ignorar (idempotencia)
    if (order.payment_status === 'paid') {
      console.log('Webhook: orden ya procesada', orderId);
      return Response.json({ received: true });
    }

    // 1. Marcar como pagada
    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_status: 'paid',
      status: 'processing',
      payment_transaction_id: session.payment_intent || session.id,
    });

    // Historial
    try {
      await base44.asServiceRole.entities.OrderStatusHistory.create({
        order_id: orderId,
        user_email: order.customer_email || 'webhook@stripe.com',
        status: 'processing',
        timestamp: new Date().toISOString(),
        notes: 'Pago confirmado via Stripe webhook',
      });
    } catch (e) { console.error('Error historial:', e.message); }

    // 2. Descontar stock
    for (const item of order.items) {
      try {
        if (item.variant_id) {
          const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
          await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, {
            stock: Math.max(0, (variant.stock ?? 0) - item.quantity),
          });
          const parent = await base44.asServiceRole.entities.Product.get(item.product_id);
          await base44.asServiceRole.entities.Product.update(item.product_id, {
            sold_count: (parent.sold_count || 0) + item.quantity,
          });
          await base44.asServiceRole.entities.InventoryLog.create({
            product_id: item.product_id, variant_id: item.variant_id,
            quantity: -item.quantity, cost_per_unit: variant.cost_per_unit || 0,
            total_cost: -item.quantity * (variant.cost_per_unit || 0),
            notes: `Venta - Orden ${order.order_number}`, movement_type: 'sale', order_id: orderId,
          });
        } else {
          const product = await base44.asServiceRole.entities.Product.get(item.product_id);
          await base44.asServiceRole.entities.Product.update(item.product_id, {
            stock: Math.max(0, (product.stock ?? 0) - item.quantity),
            sold_count: (product.sold_count || 0) + item.quantity,
          });
          await base44.asServiceRole.entities.InventoryLog.create({
            product_id: item.product_id, quantity: -item.quantity,
            cost_per_unit: product.cost_per_unit || 0,
            total_cost: -item.quantity * (product.cost_per_unit || 0),
            notes: `Venta - Orden ${order.order_number}`, movement_type: 'sale', order_id: orderId,
          });
        }
      } catch (e) { console.error('Error stock:', e.message); }
    }

    // 3. Actualizar cupón
    if (order.coupon_code) {
      try {
        const coupons = await base44.asServiceRole.entities.Coupon.filter({ code: order.coupon_code });
        if (coupons.length > 0) {
          const coupon = coupons[0];
          await base44.asServiceRole.entities.Coupon.update(coupon.id, {
            used_count: (coupon.used_count || 0) + 1,
          });
        }
      } catch (e) { console.error('Error cupón:', e.message); }
    }

    // 4. Emails
    try {
      const itemsText = order.items.map(item =>
        `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} - ${item.quantity}x $${Number(item.price).toFixed(2)}`
      ).join('\n');

      await base44.asServiceRole.functions.invoke('sendGmailEmail', {
        to: order.customer_email,
        subject: `Confirmación de Pedido - Orden ${order.order_number}`,
        body: `Hola, ${order.customer_name || 'Estimado Cliente'}.\n\nGracias por tu compra. Tu pago fue recibido correctamente.\n\nOrden #${order.order_number}\n\n${itemsText}\n\nSubtotal: $${Number(order.subtotal).toFixed(2)}\nEnvío: $${Number(order.shipping_cost).toFixed(2)}\nTOTAL: $${Number(order.total).toFixed(2)}\n\nSaludos,\nRAmi.`,
      });

      await base44.asServiceRole.functions.invoke('sendGmailEmail', {
        to: 'somosrami@gmail.com',
        subject: `🛒 Nuevo pedido ${order.order_number} - $${Number(order.total).toFixed(2)}`,
        body: `Pedido confirmado vía webhook.\n\nOrden: ${order.order_number}\nCliente: ${order.customer_name} (${order.customer_email})\nTotal: $${Number(order.total).toFixed(2)}\n\nProductos:\n${itemsText}`,
      });
    } catch (e) { console.error('Error emails:', e.message); }

    console.log('Webhook: orden procesada correctamente', orderId);
    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ received: true }); // Siempre 200 a Stripe
  }
});