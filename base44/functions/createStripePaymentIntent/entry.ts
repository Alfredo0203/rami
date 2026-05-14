import Stripe from 'npm:stripe@14.21.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { amount, orderId, customerEmail, couponCode } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Monto inválido' }, { status: 400 });
    }

    if (!orderId) {
      return Response.json({ error: 'orderId requerido' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      receipt_email: customerEmail || undefined,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        order_id: orderId || '',
        coupon_code: couponCode || '',
      },
    });



    return Response.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe PaymentIntent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});