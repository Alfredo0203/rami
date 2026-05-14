import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting data migration to explicit relations...');

    // 1. Migrate Order → Coupon (coupon_code → coupon_id)
    const orders = await base44.asServiceRole.entities.Order.list();
    const coupons = await base44.asServiceRole.entities.Coupon.list();
    const couponMap = {};
    coupons.forEach(c => {
      couponMap[c.code] = c.id;
    });

    let ordersUpdated = 0;
    for (const order of orders) {
      if (order.coupon_code && !order.coupon_id && couponMap[order.coupon_code]) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          coupon_id: couponMap[order.coupon_code]
        });
        ordersUpdated++;
      }
    }
    console.log(`Updated ${ordersUpdated} orders with coupon_id`);

    return Response.json({
      success: true,
      message: 'Migration completed',
      ordersUpdated
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});