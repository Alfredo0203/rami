import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, TrendingUp, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const RANGES = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: 'Todo', days: 0 },
];

export default function AdminSearchAnalyticsTab() {
  const [days, setDays] = useState(30);
  const [cleaning, setCleaning] = useState(false);
  const [singlesOpen, setSinglesOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['search-analytics', days],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSearchAnalytics', { days });
      return res.data;
    },
  });

  const allTerms = data?.terms || [];
  // Solo los términos que se repitieron; los de una sola búsqueda no aportan.
  const terms = allTerms.filter((t) => (t.searches || 0) > 1);
  const singleTerms = allTerms.filter((t) => (t.searches || 0) <= 1);
  const max = terms[0]?.searches || 1;
  // Los totales se calculan sobre lo que realmente se muestra en la lista.
  const repeatedSearches = terms.reduce((acc, t) => acc + (t.searches || 0), 0);
  const singleSearches = singleTerms.reduce((acc, t) => acc + (t.searches || 0), 0);

  const cleanUniqueTerms = async () => {
    setCleaning(true);
    try {
      const page = await base44.entities.SearchHistory.filter({ search_count: { $lte: 1 } }, { limit: 500 });
      const singles = page.items || [];
      await Promise.all(singles.map((r) => base44.entities.SearchHistory.delete(r.id)));
      await queryClient.invalidateQueries({ queryKey: ['search-analytics'] });
      toast.success('Se eliminaron las búsquedas de un solo uso');
    } catch (error) {
      toast.error('No se pudieron eliminar las búsquedas únicas');
    } finally {
      setCleaning(false);
    }
  };

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
          <p className="text-xl font-bold text-foreground mt-1">{repeatedSearches}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Términos repetidos
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{terms.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {singleTerms.length > 0
              ? 'Ningún término se ha buscado más de una vez en este período'
              : 'Sin búsquedas registradas en este período'}
          </p>
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

      <p className="text-[11px] text-muted-foreground px-1">
        Solo se cuentan los términos buscados más de una vez.
        {singleTerms.length > 0
          ? ` Quedan fuera ${singleTerms.length} término${singleTerms.length === 1 ? '' : 's'} con una sola búsqueda (${singleSearches} en total).`
          : ''}
      </p>

      {singleTerms.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setSinglesOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-muted-foreground"
          >
            <span>Ver búsquedas de un solo uso ({singleTerms.length})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${singlesOpen ? 'rotate-180' : ''}`} />
          </button>
          {singlesOpen &&
            singleTerms.map((t) => (
              <div
                key={t.term}
                className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40"
              >
                <span className="text-xs text-muted-foreground truncate">{t.term}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{t.searches}</span>
              </div>
            ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground px-1">Productos más vistos</h3>
        {(data?.topProducts || []).length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Aún no hay vistas registradas.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {(data?.topProducts || []).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40 last:border-0">
                <span className="text-sm text-foreground truncate">
                  <span className="text-muted-foreground text-xs mr-2">{i + 1}</span>
                  {p.name}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {p.views} vistas · {p.sold} vendidos
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={cleaning || singleTerms.length === 0}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground disabled:opacity-50"
          >
            {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Eliminar búsquedas de un solo uso
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar las búsquedas únicas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán del historial todos los términos que solo se buscaron una vez. Los términos repetidos se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={cleanUniqueTerms}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-[11px] text-muted-foreground">
        Solo incluye búsquedas y vistas de usuarios con sesión iniciada o invitados. Se guarda el término y la cantidad, nunca quién lo buscó.
      </p>
    </div>
  );
}