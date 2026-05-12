import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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

    const isOnlinePayment = order.payment_method === 'credit_card' || order.payment_method === 'paypal';

    // Para pagos con tarjeta: verificar ventana de 24 horas
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

    // Reembolso automático via Stripe si el pago fue procesado
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

    // Restaurar stock si fue descontado
    const stockWasDeducted =
      order.payment_method === 'cash_on_delivery' ||
      order.payment_status === 'paid';

    if (stockWasDeducted) {
      for (const item of order.items || []) {
        try {
          if (item.variant_id) {
            const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
            if (variant) {
              await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, {
                stock: (variant.stock ?? 0) + (item.quantity ?? 1),
              });
            }
          } else {
            const product = await base44.asServiceRole.entities.Product.get(item.product_id);
            if (product) {
              await base44.asServiceRole.entities.Product.update(item.product_id, {
                stock: (product.stock ?? 0) + (item.quantity ?? 1),
                sold_count: Math.max(0, (product.sold_count || 0) - (item.quantity ?? 1)),
              });
            }
          }
          await base44.asServiceRole.entities.InventoryLog.create({
            product_id: item.product_id,
            variant_id: item.variant_id || undefined,
            quantity: item.quantity ?? 1,
            cost_per_unit: 0,
            total_cost: 0,
            notes: `Cancelación por cliente - Orden ${order.order_number}`,
            movement_type: 'return',
            order_id: orderId,
          });
        } catch (e) {
          console.error('Error restaurando stock para item:', item.product_id, e);
        }
      }
    }

    // Actualizar orden
    const updateData = {
      status: 'cancelled',
      ...(refundId ? { internal_notes: `Reembolso Stripe: ${refundId}` } : {}),
    };
    await base44.asServiceRole.entities.Order.update(orderId, updateData);

    // Historial de estados
    await base44.asServiceRole.entities.OrderStatusHistory.create({
      order_id: orderId,
      user_email: order.customer_email,
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      notes: refundId
        ? `Cancelado por cliente. Reembolso procesado: ${refundId}`
        : 'Cancelado por cliente',
    });

    return Response.json({
      success: true,
      refunded: !!refundId,
      refund_id: refundId,
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});