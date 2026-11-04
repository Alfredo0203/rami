import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Agrega las búsquedas (solo usuarios con sesión) por término.
// Devuelve únicamente término + conteo: nunca quién buscó.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const days = Number(body?.days) || 0;

    const query = {};
    if (days > 0) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query.updated_date = { $gte: since };
    }

    const result = await base44.asServiceRole.entities.SearchHistory.aggregate({
      query,
      groupBy: 'query',
      sum: ['search_count'],
    });

    // Agrupa "Pantalón", "pantalon" y "PANTALON" como un mismo término
    const normalize = (value: string) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const merged = new Map<string, { term: string; searches: number; best: number }>();
    (result?.rows || []).forEach((r) => {
      const label = String(r.query || '').trim();
      const count = r.sum_search_count || 0;
      if (!label) return;
      const key = normalize(label);
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { term: label, searches: count, best: count });
      } else {
        current.searches += count;
        if (count > current.best) {
          current.term = label;
          current.best = count;
        }
      }
    });

    const terms = Array.from(merged.values())
      .map(({ term, searches }) => ({ term, searches }))
      .sort((a, b) => b.searches - a.searches);

    const topProducts = await base44.asServiceRole.entities.Product
      .filter({ is_active: true }, { sort: '-view_count', limit: 8 })
      .then((page) => (page.items || page || []));

    return Response.json({
      days,
      terms: terms.slice(0, 40),
      uniqueTerms: terms.length,
      totalSearches: terms.reduce((acc, t) => acc + t.searches, 0),
      topProducts: topProducts
        .filter((p) => (p.view_count || 0) > 0)
        .map((p) => ({ id: p.id, name: p.name, views: p.view_count || 0, sold: p.sold_count || 0 })),
    });
  } catch (error) {
    console.error('Error in getSearchAnalytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}