import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

/**
 * processManualRefund — ejecuta un reembolso en Stripe para solicitudes manuales
 * Solo puede ser llamado por admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { payment_transaction_id, order_id, order_number } = await req.json();

    if (!payment_transaction_id) {
      return Response.json({ error: 'payment_transaction_id es requerido' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const refund = await stripe.refunds.create({
      payment_intent: payment_transaction_id,
      reason: 'requested_by_customer',
      metadata: {
        order_id: order_id || '',
        order_number: order_number || '',
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        processed_by: user.email,
      }
    });

    console.log(`Reembolso manual procesado: ${refund.id} por admin ${user.email} para orden ${order_number}`);

    return Response.json({ success: true, refund_id: refund.id });
  } catch (error) {
    console.error('processManualRefund error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});