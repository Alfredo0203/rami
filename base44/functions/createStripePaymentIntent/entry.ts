import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { amount, orderId, customerEmail, couponCode } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // en centavos
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