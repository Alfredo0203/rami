import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Registra una vista del detalle de un producto (contador general, sin identificar al visitante).
// Disponible para invitados: el contador se incrementa con permisos de servicio.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const productId = body?.product_id;

    if (!productId || typeof productId !== 'string') {
      return Response.json({ error: 'product_id requerido' }, { status: 400 });
    }

    const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
    if (!product) {
      return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const view_count = (product.view_count || 0) + 1;
    await base44.asServiceRole.entities.Product.update(productId, { view_count });

    return Response.json({ ok: true, view_count });
  } catch (error) {
    console.error('Error in trackProductView:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}