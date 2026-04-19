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

    // Restaurar stock de productos
    for (const item of items) {
      if (item.variant_id) {
        const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
        if (variant) {
          await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, {
            stock: (variant.stock ?? 0) + (item.quantity ?? 1),
          });
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

    return Response.json({ ok: true, restored: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});