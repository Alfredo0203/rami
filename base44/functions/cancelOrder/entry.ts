import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

/**
 * cancelOrder — permite al usuario cancelar su propio pedido.
 * 
 * Reglas:
 * - shipped / delivered → NO cancela. Crea CancelRequest para revisión manual del admin.
 * - pending / processing + más de 24h (pago online) → NO cancela. Crea CancelRequest para revisión manual.
 * - pending / processing + dentro de 24h + pago confirmado → Reembolso automático Stripe + cancela.
 * - pending / processing + contra entrega → Cancela sin reembolso.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { orderId, reason } = await req.json();
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

    const isOnlinePayment = order.payment_method === 'credit_card' || order.payment_method === 'paypal';

    // CASO 1: shipped o delivered → solicitud manual, NO cancelar
    if (order.status === 'shipped' || order.status === 'delivered') {
      const requestType = order.status === 'delivered' ? 'return_request' : 'refund_request';

      await base44.asServiceRole.entities.CancelRequest.create({
        order_id: orderId,
        order_number: order.order_number,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        order_status: order.status,
        order_total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        payment_transaction_id: order.payment_transaction_id || null,
        request_type: requestType,
        reason: reason || `El cliente solicitó ${requestType === 'return_request' ? 'devolución' : 'reembolso'} para una orden ${order.status === 'delivered' ? 'ya entregada' : 'en camino'}`,
        status: 'pending_review',
      });

      // Notificar al admin
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'somosrami@gmail.com',
          subject: `⚠️ Solicitud de ${requestType === 'return_request' ? 'devolución' : 'reembolso'} - Orden #${order.order_number}`,
          body: `Se ha recibido una solicitud de ${requestType === 'return_request' ? 'devolución' : 'reembolso/cancelación'} que requiere revisión manual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETALLES DE LA SOLICITUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Orden: #${order.order_number}
Cliente: ${order.customer_name} (${order.customer_email})
Estado de la orden: ${order.status}
Total: $${order.total?.toFixed(2) || '0.00'}
Método de pago: ${order.payment_method}
Payment Transaction ID: ${order.payment_transaction_id || 'N/A'}
Motivo: ${reason || 'No especificado'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Esta solicitud requiere revisión manual ya que la orden ya fue ${order.status === 'delivered' ? 'entregada' : 'enviada'}.

Revisa y gestiona esta solicitud desde el panel de administración.`,
        });
      } catch (emailErr) {
        console.error('Error notificando admin:', emailErr.message);
      }

      return Response.json({
        success: true,
        manual_review: true,
        message: `Tu solicitud de ${requestType === 'return_request' ? 'devolución' : 'cancelación'} fue recibida. Nuestro equipo la revisará y te contactará pronto.`,
      });
    }

    // CASO 2: pending / processing
    if (!['pending', 'processing'].includes(order.status)) {
      return Response.json({ error: `No se puede cancelar un pedido en estado "${order.status}"` }, { status: 409 });
    }

    // CASO 3: pago online + más de 24 horas → solicitud manual
    if (isOnlinePayment) {
      const orderDate = new Date(order.created_date);
      const now = new Date();
      const hoursDiff = (now - orderDate) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        await base44.asServiceRole.entities.CancelRequest.create({
          order_id: orderId,
          order_number: order.order_number,
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          order_status: order.status,
          order_total: order.total,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          payment_transaction_id: order.payment_transaction_id || null,
          request_type: 'cancel_request',
          reason: reason || 'Cancelación solicitada fuera del plazo de 24 horas',
          status: 'pending_review',
        });

        // Notificar admin
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'somosrami@gmail.com',
            subject: `⚠️ Solicitud de cancelación fuera de plazo - Orden #${order.order_number}`,
            body: `Se ha recibido una solicitud de cancelación fuera del plazo de 24 horas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETALLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Orden: #${order.order_number}
Cliente: ${order.customer_name} (${order.customer_email})
Estado: ${order.status}
Total: $${order.total?.toFixed(2) || '0.00'}
Horas desde la compra: ${hoursDiff.toFixed(1)}h
Motivo: ${reason || 'No especificado'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revisa y gestiona desde el panel de administración.`,
          });
        } catch (emailErr) {
          console.error('Error notificando admin:', emailErr.message);
        }

        return Response.json({
          success: true,
          manual_review: true,
          message: 'El plazo de 24 horas ha vencido, pero registramos tu solicitud. Nuestro equipo la revisará y te contactará pronto.',
        });
      }
    }

    // CASO 4: pending / processing + dentro de 24h (o contra entrega) → cancelar automáticamente
    let refundId = null;
    if (isOnlinePayment && order.payment_status === 'paid' && order.payment_transaction_id) {
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

    // Actualizar orden a cancelled (onOrderCancelled se encarga del stock)
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'cancelled',
      ...(refundId ? { internal_notes: `Reembolso Stripe: ${refundId}` } : {}),
    });

    await base44.asServiceRole.entities.OrderStatusHistory.create({
      order_id: orderId,
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      notes: refundId
        ? `Cancelado por cliente. Reembolso procesado automáticamente: ${refundId}`
        : 'Cancelado por cliente',
    });

    return Response.json({
      success: true,
      refunded: !!refundId,
      refund_id: refundId,
      message: refundId
        ? 'Pedido cancelado y reembolso procesado. Llegará en 5-10 días hábiles.'
        : 'Pedido cancelado correctamente.',
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});