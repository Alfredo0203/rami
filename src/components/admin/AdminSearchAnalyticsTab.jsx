import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, TrendingUp } from 'lucide-react';

const RANGES = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: 'Todo', days: 0 },
];

export default function AdminSearchAnalyticsTab() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['search-analytics', days],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSearchAnalytics', { days });
      return res.data;
    },
  });

  const terms = data?.terms || [];
  const max = terms[0]?.searches || 1;

  return (
    <div className="space-y-4 mt-3 pb-24">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              days === r.days
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-foreground border-border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Search className="w-3.5 h-3.5" /> Búsquedas
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{data?.totalSearches ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Términos
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{data?.uniqueTerms ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin búsquedas registradas en este período</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {terms.map((t, i) => (
            <div key={t.term} className="px-3 py-2.5 border-b border-border/40 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground truncate">
                  <span className="text-muted-foreground text-xs mr-2">{i + 1}</span>
                  {t.term}
                </span>
                <span className="text-xs font-semibold text-foreground flex-shrink-0">{t.searches}</span>
              </div>
              <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.max(4, Math.round((t.searches / max) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Solo incluye búsquedas de usuarios con sesión iniciada. Se guarda el término y la cantidad, nunca quién lo buscó.
      </p>
    </div>
  );
}