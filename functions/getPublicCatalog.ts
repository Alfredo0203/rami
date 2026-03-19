import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [products, categories] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Category.list('sort_order'),
    ]);

    return Response.json({ products, categories });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});