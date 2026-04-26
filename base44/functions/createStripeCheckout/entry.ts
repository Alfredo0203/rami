import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { cartItems, shippingAddress, couponCode, discount, shipping, orderId, customerEmail } = body;

    if (!cartItems?.length) {
      return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    // Build line items from cart
    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product_name + (item.variant_name ? ` (${item.variant_name})` : ''),
          images: item.product_image ? [item.product_image] : [],
        },
        unit_amount: Math.round((item.product_price || 0) * 100),
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item if applicable
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Envío' },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    // Add discount as a negative line item if applicable
    if (discount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: `Descuento${couponCode ? ` (${couponCode})` : ''}` },
          unit_amount: -Math.round(discount * 100),
        },
        quantity: 1,
      });
    }

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail || undefined,
      success_url: `${appUrl}/OrderConfirmation?id=${orderId}&payment=success`,
      cancel_url: `${appUrl}/Checkout?payment=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        order_id: orderId || '',
        coupon_code: couponCode || '',
      },
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});