import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14';

/**
 * cancelOrder — permite al usuario cancelar su propio pedido.
 * 
 * Reglas:
 * - Efectivo (cash_on_delivery): puede cancelar mientras esté en pending/processing
 * - Tarjeta / Wompi (credit_card): solo dentro de las primeras 24h + estado pending/processing
 *   → si está pagado (payment_status=paid), se hace reembolso automático via Stripe
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return Response.json({ error: 'orderId es requerido' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Verificar que el pedido pertenece al usuario
    if (order.customer_email !== user.email) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo se puede cancelar si está en pending o processing
    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return Response.json({ error: `No se puede cancelar un pedido en estado "${order.status}"` }, { status: 409 });
    }

    const isOnlinePayment = ['credit_card', 'paypal', 'wompi'].includes(order.payment_method);

    // Para pagos en línea (tarjeta, paypal, wompi): verificar ventana de 24 horas
    if (isOnlinePayment) {
      const orderDate = new Date(order.created_date);
      const now = new Date();
      const hoursDiff = (now - orderDate) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        return Response.json({
          error: 'El plazo de 24 horas para cancelar pedidos con tarjeta ha expirado. Contacta soporte para asistencia.'
        }, { status: 409 });
      }
    }

    // Reembolso: Stripe para credit_card/paypal; manual para Wompi (sin API de reembolso)
    let refundId = null;
    let manualRefundNeeded = false;

    if (order.payment_status === 'paid') {
      if (order.payment_method === 'wompi') {
        // Wompi no tiene API de reembolso — marcar para reembolso manual
        manualRefundNeeded = true;
        console.log(`Orden ${order.order_number}: reembolso Wompi manual requerido (tx: ${order.payment_transaction_id})`);
      } else if (isOnlinePayment && order.payment_transaction_id) {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        try {
          const refund = await stripe.refunds.create({
            payment_intent: order.payment_transaction_id,
            reason: 'requested_by_customer',
            metadata: {
              order_id: orderId,
              order_number: order.order_number,
              base44_app_id: Deno.env.get('BASE44_APP_ID'),
            }
          });
          refundId = refund.id;
          console.log(`Reembolso creado: ${refundId} para orden ${order.order_number}`);
        } catch (stripeErr) {
          console.error('Error creando reembolso en Stripe:', stripeErr.message);
          return Response.json({
            error: 'No se pudo procesar el reembolso. Contacta soporte.'
          }, { status: 502 });
        }
      }
    }

    // La restauración de stock la maneja la automatización onOrderCancelled
    // para evitar doble restauración.

    // Actualizar orden
    const internalNotes = refundId
      ? `Reembolso Stripe: ${refundId}`
      : manualRefundNeeded
        ? `REEMBOLSO WOMPI PENDIENTE — procesar manualmente en panel Wompi (tx: ${order.payment_transaction_id || 'N/A'})`
        : undefined;
    const updateData = {
      status: 'cancelled',
      ...(internalNotes ? { internal_notes: internalNotes } : {}),
    };
    await base44.asServiceRole.entities.Order.update(orderId, updateData);

    // Historial de estados
    await base44.asServiceRole.entities.OrderStatusHistory.create({
      order_id: orderId,
      user_email: order.customer_email,
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      notes: refundId
        ? `Cancelado por cliente. Reembolso Stripe procesado: ${refundId}`
        : manualRefundNeeded
          ? `Cancelado por cliente. Reembolso Wompi pendiente (manual).`
          : 'Cancelado por cliente',
    });

    // Email de notificación al cliente
    try {
      const refundBlock = refundId
        ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 16px;margin:20px 0;"><p style="margin:0;color:#92400e;font-size:14px;line-height:1.5;"><strong>Reembolso procesado</strong><br>Tu reembolso ha sido procesado y se reflejará en tu tarjeta en 5-10 días hábiles.</p></div>`
        : manualRefundNeeded
          ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 16px;margin:20px 0;"><p style="margin:0;color:#92400e;font-size:14px;line-height:1.5;"><strong>Reembolso en proceso</strong><br>Tu reembolso está siendo procesado manualmente y se reflejará en tu cuenta en los próximos días hábiles.</p></div>`
          : '';
      const customerName = order.customer_name || 'cliente';
      const total = Number(order.total).toFixed(2);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<div style="background:linear-gradient(135deg,#3894EF,#1a6cc7);padding:20px 24px;text-align:center;"><h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">Pedido cancelado</h1></div>
<div style="padding:32px 24px;">
<h2 style="color:#18181b;font-size:20px;font-weight:700;margin:0 0 16px;">Pedido cancelado</h2>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">Hola ${customerName},</p>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">Hemos confirmado la cancelación de tu pedido <strong>#${order.order_number}</strong> por un total de <strong>$${total}</strong>.</p>
${refundBlock}
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Detalles del pedido</p>
<p style="color:#18181b;font-size:14px;margin:0;">Orden: #${order.order_number}</p>
<p style="color:#18181b;font-size:14px;margin:4px 0 0;">Total: $${total}</p>
</div>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:16px 0 0;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
</div>
<div style="background:#f4f4f5;padding:24px;text-align:center;border-top:1px solid #e4e4e7;">
<p style="color:#71717a;font-size:13px;margin:0 0 8px;">¿Necesitas ayuda? Escríbenos a <a href="mailto:somosrami@gmail.com" style="color:#3894EF;text-decoration:none;">somosrami@gmail.com</a></p>

</div>
</div>
</body></html>`;
      const customerCancelText = `Pedido cancelado

Hola ${customerName},

Hemos confirmado la cancelacion de tu pedido #${order.order_number} por un total de $${total}.${refundId ? '\n\nTu reembolso ha sido procesado y se reflejara en tu tarjeta en 5-10 dias habiles.' : manualRefundNeeded ? '\n\nTu reembolso esta siendo procesado manualmente y se reflejara en tu cuenta en los proximos dias habiles.' : ''}

Si tienes alguna pregunta, no dudes en contactarnos a somosrami@gmail.com.`;

      await base44.asServiceRole.functions.invoke('sendGmailEmail', {
        to: order.customer_email,
        subject: `Tu pedido #${order.order_number} ha sido cancelado`,
        html,
        text: customerCancelText,
      });
    } catch (emailErr) {
      console.error('Error enviando email de cancelación:', emailErr.message);
    }

    // Notificación al admin (somosrami@gmail.com)
    try {
      const customerName = order.customer_name || 'cliente';
      const total = Number(order.total).toFixed(2);
      const adminHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<div style="background:linear-gradient(135deg,#3894EF,#1a6cc7);padding:20px 24px;text-align:center;"><h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">Pedido cancelado</h1></div>
<div style="padding:32px 24px;">
<h2 style="color:#18181b;font-size:20px;font-weight:700;margin:0 0 16px;">Cancelación de pedido</h2>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 16px;margin:20px 0;"><p style="margin:0;color:#92400e;font-size:14px;line-height:1.5;">El cliente <strong>${customerName}</strong> canceló el pedido <strong>#${order.order_number}</strong> por <strong>$${total}</strong>.</p></div>
<table style="width:100%;font-size:14px;color:#3f3f46;border-collapse:collapse;">
<tr><td style="padding:6px 0;color:#71717a;">Orden</td><td style="text-align:right;padding:6px 0;color:#18181b;font-weight:600;">#${order.order_number}</td></tr>
<tr><td style="padding:6px 0;color:#71717a;">Cliente</td><td style="text-align:right;padding:6px 0;color:#18181b;font-weight:600;">${customerName}</td></tr>
<tr><td style="padding:6px 0;color:#71717a;">Email</td><td style="text-align:right;padding:6px 0;color:#18181b;">${order.customer_email || ''}</td></tr>
<tr><td style="padding:6px 0;color:#71717a;">Método de pago</td><td style="text-align:right;padding:6px 0;color:#18181b;">${order.payment_method || 'N/A'}</td></tr>
${refundId ? `<tr><td style="padding:6px 0;color:#71717a;">Reembolso</td><td style="text-align:right;padding:6px 0;color:#18181b;">Sí (Stripe: ${refundId})</td></tr>` : manualRefundNeeded ? `<tr><td style="padding:6px 0;color:#71717a;">Reembolso</td><td style="text-align:right;padding:6px 0;color:#dc2626;font-weight:600;">PENDIENTE MANUAL (Wompi)</td></tr>` : ''}
<tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;">Total</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;color:#3894EF;border-top:1px solid #e4e4e7;">$${total}</td></tr>
</table>
<p style="color:#71717a;font-size:13px;margin:16px 0 0;">Revisa los detalles en el panel de administración.</p>
</div>
<div style="background:#f4f4f5;padding:24px;text-align:center;border-top:1px solid #e4e4e7;"></div>
</div>
</body></html>`;
      const adminCancelText = `Pedido cancelado por el cliente

El cliente ${customerName} cancelo el pedido #${order.order_number} por $${total}.

Orden: #${order.order_number}
Cliente: ${customerName}
Email: ${order.customer_email || ''}
Metodo de pago: ${order.payment_method || 'N/A'}
${refundId ? `Reembolso: Si (Stripe: ${refundId})\n` : manualRefundNeeded ? `Reembolso: PENDIENTE MANUAL (Wompi tx: ${order.payment_transaction_id || 'N/A'})\n` : ''}Total: $${total}

Revisa los detalles en el panel de administracion.`;

      await base44.asServiceRole.functions.invoke('sendGmailEmail', {
        to: 'somosrami@gmail.com',
        subject: `Pedido cancelado #${order.order_number} - ${customerName}`,
        html: adminHtml,
        text: adminCancelText,
      });
    } catch (adminEmailErr) {
      console.error('Error enviando email de cancelación al admin:', adminEmailErr.message);
    }

    return Response.json({
      success: true,
      refunded: !!refundId,
      manual_refund_pending: manualRefundNeeded,
      refund_id: refundId,
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});