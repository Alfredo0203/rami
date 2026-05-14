import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting complete data migration to explicit relations...');
    const stats = {};

    // Get users for mapping
    const users = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    users.forEach(u => {
      userMap[u.email] = u.id;
    });
    console.log(`Found ${Object.keys(userMap).length} users`);

    // 1. Migrate Address → User (created_by → user_id)
    const addresses = await base44.asServiceRole.entities.Address.list();
    stats.addressesUpdated = 0;
    for (const addr of addresses) {
      if (addr.created_by && !addr.user_id && userMap[addr.created_by]) {
        await base44.asServiceRole.entities.Address.update(addr.id, {
          user_id: userMap[addr.created_by]
        });
        stats.addressesUpdated++;
      }
    }
    console.log(`Updated ${stats.addressesUpdated} addresses with user_id`);

    // 2. Migrate CartItem → User (created_by → user_id)
    const cartItems = await base44.asServiceRole.entities.CartItem.list();
    stats.cartItemsUpdated = 0;
    for (const item of cartItems) {
      if (item.created_by && !item.user_id && userMap[item.created_by]) {
        await base44.asServiceRole.entities.CartItem.update(item.id, {
          user_id: userMap[item.created_by]
        });
        stats.cartItemsUpdated++;
      }
    }
    console.log(`Updated ${stats.cartItemsUpdated} cart items with user_id`);

    // 3. Migrate Wishlist → User (created_by → user_id)
    const wishlists = await base44.asServiceRole.entities.Wishlist.list();
    stats.wishlistsUpdated = 0;
    for (const wish of wishlists) {
      if (wish.created_by && !wish.user_id && userMap[wish.created_by]) {
        await base44.asServiceRole.entities.Wishlist.update(wish.id, {
          user_id: userMap[wish.created_by]
        });
        stats.wishlistsUpdated++;
      }
    }
    console.log(`Updated ${stats.wishlistsUpdated} wishlist items with user_id`);

    // 4. Migrate Review → User (created_by → user_id)
    const reviews = await base44.asServiceRole.entities.Review.list();
    stats.reviewsUpdated = 0;
    for (const review of reviews) {
      if (review.created_by && !review.user_id && userMap[review.created_by]) {
        try {
          await base44.asServiceRole.entities.Review.update(review.id, {
            user_id: userMap[review.created_by]
          });
          stats.reviewsUpdated++;
        } catch (e) {
          console.log(`Skipped review ${review.id}: ${e.message}`);
        }
      }
    }
    console.log(`Updated ${stats.reviewsUpdated} reviews with user_id`);

    // 5. Migrate SearchHistory → User (created_by → user_id)
    const searches = await base44.asServiceRole.entities.SearchHistory.list();
    stats.searchesUpdated = 0;
    for (const search of searches) {
      if (search.created_by && !search.user_id && userMap[search.created_by]) {
        await base44.asServiceRole.entities.SearchHistory.update(search.id, {
          user_id: userMap[search.created_by]
        });
        stats.searchesUpdated++;
      }
    }
    console.log(`Updated ${stats.searchesUpdated} searches with user_id`);

    // 6. Migrate Order → Coupon (coupon_code → coupon_id) and Order → Address (address_id)
    const coupons = await base44.asServiceRole.entities.Coupon.list();
    const couponMap = {};
    coupons.forEach(c => {
      couponMap[c.code] = c.id;
    });

    const orders = await base44.asServiceRole.entities.Order.list();
    stats.ordersUpdated = 0;
    for (const order of orders) {
      const updateData = {};
      if (order.coupon_code && !order.coupon_id && couponMap[order.coupon_code]) {
        updateData.coupon_id = couponMap[order.coupon_code];
      }
      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Order.update(order.id, updateData);
        stats.ordersUpdated++;
      }
    }
    console.log(`Updated ${stats.ordersUpdated} orders with coupon_id`);

    return Response.json({
      success: true,
      message: 'Complete migration finished',
      stats
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});