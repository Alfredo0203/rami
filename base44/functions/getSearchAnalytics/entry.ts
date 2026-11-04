import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mergeSearchTerms } from '../../shared/searchTerms.ts';

// Agrega registros de búsquedas (solo usuarios con sesión) por término.
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
    const { startDate = null, endDate = null } = body;
    const cursor = Number(body.cursor ?? 0);
    const action = body.action || 'list';
    const isCalendarDate = (value) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    const hasRange = startDate !== null || endDate !== null;
    if ((hasRange && (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate)) ||
        !Number.isSafeInteger(cursor) || cursor < 0 || !['list', 'clear_single_terms'].includes(action)) {
      return Response.json({ error: 'Selecciona una fecha inicial y final válidas' }, { status: 400 });
    }
    const query = {};
    if (hasRange && action === 'list') {
      // El Salvador (UTC-06): incluye el día inicial y todo el día final.
      const from = new Date(`${startDate}T00:00:00-06:00`);
      const until = new Date(`${endDate}T00:00:00-06:00`);
      until.setUTCDate(until.getUTCDate() + 1);
      query.updated_date = { $gte: from.toISOString(), $lt: until.toISOString() };
    }
    // Las búsquedas nuevas son registros individuales, no contadores que cambian de fecha.
    // Los registros históricos conservan su conteo y su última fecha disponible.
    const result = await base44.asServiceRole.entities.SearchHistory.aggregate({
      query, groupBy: 'query', sum: ['search_count'],
    });
    const allTerms = mergeSearchTerms(result.rows);
    const repeatedTerms = allTerms.filter((item) => item.searches > 1);
    const singleTerms = allTerms.filter((item) => item.searches === 1);

    if (action === 'clear_single_terms') {
      const queries = singleTerms.flatMap((item) => item.queries);
      if (queries.length) {
        await base44.asServiceRole.entities.SearchHistory.deleteMany({ query: { $in: queries } });
      }
      return Response.json({ removedTerms: singleTerms.length });
    }

    const pageSize = 40;
    const toPublicTerm = ({ term, searches }) => ({ term, searches });
    const topProducts = await base44.asServiceRole.entities.Product
      .filter({ is_active: true, view_count: { $gt: 0 } }, { sort: '-view_count', limit: 8 });
    return Response.json({
      startDate,
      endDate,
      terms: repeatedTerms.slice(cursor, cursor + pageSize).map(toPublicTerm),
      singleTerms: singleTerms.slice(cursor, cursor + pageSize).map(toPublicTerm),
      uniqueTerms: allTerms.length,
      repeatedTermCount: repeatedTerms.length,
      singleTermCount: singleTerms.length,
      repeatedSearches: repeatedTerms.reduce((sum, item) => sum + item.searches, 0),
      singleSearches: singleTerms.length,
      totalSearches: allTerms.reduce((sum, item) => sum + item.searches, 0),
      nextCursor: Math.max(repeatedTerms.length, singleTerms.length) > cursor + pageSize ? cursor + pageSize : null,
      topProducts: (topProducts.items || []).map((p) => ({
        id: p.id, name: p.name, views: p.view_count || 0, sold: p.sold_count || 0,
      })),
    });
  } catch (error) {
    console.error('Error in getSearchAnalytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}