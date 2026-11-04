import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * removeProductFromCarts — quita un producto de todos los carritos.
 * Se llama al desactivar un producto para que ningún cliente lo siga viendo en su carrito.
 * Puede usarlo un admin, un super_admin o el vendedor dueño de la tienda del producto.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { productId } = await req.json().catch(() => ({}));
    if (!productId) return Response.json({ error: 'productId es requerido' }, { status: 400 });

    const product = await base44.asServiceRole.entities.Product
      .get(productId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!product) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
      if (user.role !== 'seller') return Response.json({ error: 'Prohibido' }, { status: 403 });
      const store = product.store_id
        ? await base44.asServiceRole.entities.Store.get(product.store_id).catch(() => null)
        : null;
      if (!store || store.owner_email !== user.email) {
        return Response.json({ error: 'Prohibido' }, { status: 403 });
      }
    }

    const removed = await base44.asServiceRole.entities.CartItem.count({ product_id: productId });
    if (removed > 0) {
      await base44.asServiceRole.entities.CartItem.deleteMany({ product_id: productId });
    }

    return Response.json({ success: true, removed });
  } catch (error) {
    console.error('removeProductFromCarts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}