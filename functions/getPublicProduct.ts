import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { product_id } = await req.json();

    if (!product_id) {
      return Response.json({ error: 'product_id is required' }, { status: 400 });
    }

    const product = await base44.asServiceRole.entities.Product.get(product_id);
    return Response.json({ product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});