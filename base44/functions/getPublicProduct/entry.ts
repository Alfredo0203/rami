import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { product_id } = await req.json();

    if (!product_id) {
      return Response.json({ error: 'product_id is required' }, { status: 400 });
    }

    const [product, variants] = await Promise.all([
      base44.asServiceRole.entities.Product.get(product_id),
      base44.asServiceRole.entities.ProductVariant.filter({ product_id }).catch(() => []),
    ]);

    const activeVariants = variants.filter(v => v.is_active !== false);
    activeVariants.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return Response.json({ product, variants: activeVariants });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});