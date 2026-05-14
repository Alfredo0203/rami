import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * onOrderCancelled — se dispara via automatización de entidad cuando
 * una orden cambia a status "cancelled". Restaura el stock de cada item.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Solo actuar si el status cambió a "cancelled" y antes no era "cancelled"
    if (data?.status !== 'cancelled' || old_data?.status === 'cancelled') {
      return Response.json({ skipped: true });
    }

    const items = data.items || [];
    const couponCode = data.coupon_code;
    const customerEmail = data.customer_email;

    // Solo restaurar stock si fue efectivamente descontado:
    // - Contraentrega: siempre se descuenta en placeOrder
    // - Pago online: solo si payment_status === 'paid'
    const stockWasDeducted =
      data.payment_method === 'cash_on_delivery' ||
      data.payment_status === 'paid';

    if (stockWasDeducted) {
      for (const item of items) {
        try {
          if (item.variant_id) {
            const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
            if (variant) {
              await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, {
                stock: (variant.stock ?? 0) + (item.quantity ?? 1),
              });
              const parentProduct = await base44.asServiceRole.entities.Product.get(item.product_id);
              if (parentProduct) {
                await base44.asServiceRole.entities.Product.update(item.product_id, {
                  sold_count: Math.max(0, (parentProduct.sold_count || 0) - (item.quantity ?? 1)),
                });
              }
            }
          } else if (item.product_id) {
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
            notes: `Cancelación - Orden ${data.order_number}`,
            movement_type: 'return',
            order_id: data.id,
          });
        } catch (e) {
          console.error('Error restaurando stock para item:', item.product_id, e);
        }
      }
    }

    // Recuperar cupón si fue usado
    if (couponCode && customerEmail) {
      try {
        const coupons = await base44.asServiceRole.entities.Coupon.filter({ 
          code: couponCode.toUpperCase() 
        });

        if (coupons.length > 0) {
          const coupon = coupons[0];
          await base44.asServiceRole.entities.Coupon.update(coupon.id, {
            used_count: Math.max(0, (coupon.used_count || 1) - 1),
          });

          if (coupon.is_user_specific) {
            const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
              coupon_id: coupon.id,
              user_email: customerEmail
            });
            if (assignments.length > 0) {
              await base44.asServiceRole.entities.CouponAssignment.update(assignments[0].id, {
                usage_count: Math.max(0, (assignments[0].usage_count || 1) - 1),
                status: 'available',
                used_date: null
              });
            }
          }
        }
      } catch (couponErr) {
        console.log('Warning: Could not restore coupon:', couponErr.message);
      }
    }

    // Notificar al usuario
    if (customerEmail && data.order_number) {
      try {
        const itemsList = items
          .map(item => `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} - $${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`)
          .join('\n');

        // Verificar estado real del pago:
        // 1. Si hay payment_transaction_id → consultar Stripe directamente
        // 2. Si no → confiar en el campo payment_status de la orden
        let stripeConfirmedPaid = false;

        if (data.payment_transaction_id && data.payment_method !== 'cash_on_delivery') {
          try {
            const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
            // El transaction_id puede ser un PaymentIntent (pi_...) o un Checkout Session (cs_...)
            const txId = data.payment_transaction_id;
            if (txId.startsWith('pi_')) {
              const pi = await stripe.paymentIntents.retrieve(txId);
              stripeConfirmedPaid = pi.status === 'succeeded';
              console.log(`Stripe PaymentIntent ${txId} status: ${pi.status}`);
            } else if (txId.startsWith('cs_')) {
              const session = await stripe.checkout.sessions.retrieve(txId);
              stripeConfirmedPaid = session.payment_status === 'paid';
              console.log(`Stripe CheckoutSession ${txId} payment_status: ${session.payment_status}`);
            }
          } catch (stripeErr) {
            // Si falla la consulta a Stripe, caer al campo local como fallback
            console.error('No se pudo verificar con Stripe, usando payment_status local:', stripeErr.message);
            stripeConfirmedPaid = data.payment_status === 'paid';
          }
        } else {
          // Sin transaction_id: confiar en el campo local
          stripeConfirmedPaid = data.payment_status === 'paid';
        }

        // Nota de pago según verificación real:
        let paymentNote = '';
        if (stripeConfirmedPaid) {
          paymentNote = `\n⚠️ Información sobre tu pago:\nConfirmamos que se realizó un cobro de $${data.total?.toFixed(2) || '0.00'} para esta orden. Nuestro equipo se pondrá en contacto contigo a este correo para gestionar el reembolso correspondiente.\n`;
        } else if (data.payment_method !== 'cash_on_delivery') {
          paymentNote = `\nℹ️ Información sobre tu pago:\nNo se realizó ningún cargo a tu método de pago ya que el pago no fue completado antes de la cancelación.\n`;
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          subject: `❌ Tu pedido #${data.order_number} ha sido cancelado - RAmi`,
          body: `Hola ${data.customer_name || 'cliente'},

Lamentamos informarte que tu pedido ha sido cancelado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PEDIDO CANCELADO
Número de orden: #${data.order_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Artículos:
${itemsList}

Total: $${data.total?.toFixed(2) || '0.00'}
${paymentNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si tienes alguna duda, escríbenos a somosrami@gmail.com indicando tu número de orden #${data.order_number}.

Gracias por tu comprensión.
Equipo RAmi`,
        });
      } catch (e) {
        console.error('Error enviando correo cancelación al usuario:', e);
      }
    }

    return Response.json({ ok: true, restored: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});