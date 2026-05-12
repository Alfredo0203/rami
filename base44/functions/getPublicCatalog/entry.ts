import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [products, categories, variants, reviews] = await Promise.all([
      base44.asServiceRole.entities.Product.list('sort_order', 200),
      base44.asServiceRole.entities.Category.list('sort_order'),
      base44.asServiceRole.entities.ProductVariant.filter({ is_active: true }, null, 500),
      base44.asServiceRole.entities.Review.filter({ is_approved: true }, null, 500),
    ]);

    // Calcular rating real desde reseñas aprobadas
    const reviewsByProduct = {};
    for (const r of reviews) {
      if (!reviewsByProduct[r.product_id]) reviewsByProduct[r.product_id] = [];
      reviewsByProduct[r.product_id].push(r);
    }

    // Calcular stock efectivo para cada producto:
    // - Si tiene variantes → suma el stock de todas sus variantes activas
    // - Si no tiene variantes → usa product.stock directamente
    const variantsByProduct = {};
    for (const v of variants) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
      variantsByProduct[v.product_id].push(v);
    }

    const enrichedProducts = products.map(p => {
      const productVariants = variantsByProduct[p.id] || [];
      const effectiveStock = p.has_variants
        ? productVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : (p.stock || 0);

      // Collect unique variant attribute values (e.g. colors, sizes from variants)
      const variantAttributes = {};
      for (const v of productVariants) {
        if (Array.isArray(v.attributes)) {
          for (const attr of v.attributes) {
            if (!variantAttributes[attr.key]) variantAttributes[attr.key] = new Set();
            (attr.values || []).forEach(val => variantAttributes[attr.key].add(val));
          }
        }
      }
      // Convert sets to arrays
      const variantAttributesFlat = {};
      for (const [key, set] of Object.entries(variantAttributes)) {
        variantAttributesFlat[key] = Array.from(set);
      }

      // Calcular rating y review_count desde reseñas aprobadas reales
      const productReviews = reviewsByProduct[p.id] || [];
      const review_count = productReviews.length;
      const rating = review_count > 0
        ? productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / review_count
        : 0;

      return { ...p, effective_stock: effectiveStock, variant_attributes: variantAttributesFlat, rating, review_count };
    });

    return Response.json({ products: enrichedProducts, categories, variants });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});