import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getSellerOrders — devuelve únicamente los pedidos que contienen productos
 * de la tienda del vendedor.
 *
 * Reemplaza la lectura directa de la entidad Order desde el dashboard de
 * vendedor, que le permitía ver todos los pedidos de la tienda (incluidos
 * nombre, teléfono y dirección de clientes ajenos a su tienda).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    if (!['seller', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ orders: [] });
    }

    const stores = await base44.asServiceRole.entities.Store.filter({ owner_email: user.email });
    const storeIds = stores.map((s) => s.id);
    if (storeIds.length === 0) return Response.json({ orders: [] });

    const products = await base44.asServiceRole.entities.Product.filter({
      store_id: { $in: storeIds },
    });
    const ownedIds = new Set(products.map((p) => p.id));

    const orders = [];
    let cursor = null;
    for (let page = 0; page < 10; page++) {
      const res = await base44.asServiceRole.entities.Order.list({
        sort: '-created_date',
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      const batch = res?.items || (Array.isArray(res) ? res : []);
      orders.push(
        ...batch.filter((order) => (order.items || []).some((item) => ownedIds.has(item.product_id)))
      );
      if (!res?.has_more || !res?.next_cursor) break;
      cursor = res.next_cursor;
    }

    return Response.json({ orders });
  } catch (error) {
    console.error('getSellerOrders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});