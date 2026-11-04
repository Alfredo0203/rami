export function normalizeSearchTerm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function mergeSearchTerms(rows) {
  const merged = new Map();
  for (const row of rows || []) {
    const label = String(row.query || '').trim();
    const key = normalizeSearchTerm(label);
    const count = Number(row.sum_search_count ?? row.count ?? 0);
    if (!key || count <= 0) continue;
    let term = merged.get(key);
    if (!term) {
      term = { key, term: label, searches: 0, best: 0, queries: [], lastSearchedAt: '' };
      merged.set(key, term);
    }
    term.searches += count;
    term.queries.push(row.query);
    if (count > term.best) {
      term.term = label;
      term.best = count;
    }
    const latest = String(row.max_updated_date || '');
    if (latest > term.lastSearchedAt) term.lastSearchedAt = latest;
  }
  return Array.from(merged.values()).sort((a, b) => b.searches - a.searches || a.term.localeCompare(b.term));
}