import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mergeSearchTerms, normalizeSearchTerm } from '../../shared/searchTerms.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { action = 'list', term } = await req.json().catch(() => ({}));
    if (!['list', 'delete', 'clear'].includes(action)) {
      return Response.json({ error: 'Acción no válida' }, { status: 400 });
    }
    const query = { user_email: user.email };
    if (action === 'clear') {
      await base44.entities.SearchHistory.deleteMany(query);
      return Response.json({ ok: true });
    }
    if (action === 'delete' && (typeof term !== 'string' || !term.trim())) {
      return Response.json({ error: 'Término requerido' }, { status: 400 });
    }
    const result = await base44.entities.SearchHistory.aggregate({
      query, groupBy: 'query', sum: ['search_count'], max: ['updated_date'],
    });
    const terms = mergeSearchTerms(result.rows);
    if (action === 'delete') {
      const match = terms.find((item) => item.key === normalizeSearchTerm(term));
      if (match) await base44.entities.SearchHistory.deleteMany({ ...query, query: { $in: match.queries } });
      return Response.json({ ok: true });
    }
    const recent = [...terms].sort((a, b) => b.lastSearchedAt.localeCompare(a.lastSearchedAt)).slice(0, 20);
    const selected = new Map([...recent, ...terms.slice(0, 5)].map((item) => [item.key, item]));
    return Response.json({ history: [...selected.values()].map((item) => ({
      id: item.key, query: item.term, search_count: item.searches, updated_date: item.lastSearchedAt,
    })) });
  } catch (error) {
    console.error('Error in getSearchHistory:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}