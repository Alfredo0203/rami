import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
              // También restaurar sold_count del producto padre
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

          // Decrementar contador total del cupón
          await base44.asServiceRole.entities.Coupon.update(coupon.id, {
            used_count: Math.max(0, (coupon.used_count || 1) - 1),
          });

          // Si es específico de usuarios, recuperar el assignment
          if (coupon.is_user_specific) {
            const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
              coupon_id: coupon.id,
              user_email: customerEmail
            });

            if (assignments.length > 0) {
              const assignment = assignments[0];
              await base44.asServiceRole.entities.CouponAssignment.update(assignment.id, {
                usage_count: Math.max(0, (assignment.usage_count || 1) - 1),
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

    // Notificar al usuario que su orden fue cancelada (si fue cancelada por automatización, no por el admin)
    if (customerEmail && data.order_number) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          subject: `Tu pedido #${data.order_number} fue cancelado`,
          body: `Hola ${data.customer_name || 'cliente'},\n\nTu pedido #${data.order_number} ha sido cancelado.\n\nSi tienes dudas o crees que esto es un error, contáctanos.\n\nGracias,\nRAmi`,
        });
      } catch (e) { console.error('Error enviando correo cancelación al usuario:', e); }
    }

    return Response.json({ ok: true, restored: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});