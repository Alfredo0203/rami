import React, { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, TrendingUp, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import SearchAnalyticsDateFilter from '@/components/admin/SearchAnalyticsDateFilter';
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

export default function AdminSearchAnalyticsTab() {
  const [dateRange, setDateRange] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [singlesOpen, setSinglesOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pages, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['search-analytics', 'date-range', dateRange],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await base44.functions.invoke('getSearchAnalytics', { ...dateRange, cursor: pageParam });
      return res.data;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const data = pages?.pages?.[0];
  const terms = pages?.pages?.flatMap((page) => page.terms) || [];
  const singleTerms = pages?.pages?.flatMap((page) => page.singleTerms) || [];
  const max = terms[0]?.searches || 1;
  const singleTermCount = data?.singleTermCount || 0;

  const cleanUniqueTerms = async () => {
    setCleaning(true);
    try {
      await base44.functions.invoke('getSearchAnalytics', { action: 'clear_single_terms' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['search-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['search-history'] }),
      ]);
      toast.success('Se eliminaron las búsquedas de un solo uso');
    } catch (error) {
      toast.error('No se pudieron eliminar las búsquedas únicas');
    } finally {
      setCleaning(false);
    }
  };

  if (isError) return (
    <div className="space-y-3 mt-3 p-4 bg-card border border-border rounded-xl">
      <SearchAnalyticsDateFilter value={dateRange} onChange={setDateRange} />
      <p className="text-sm text-destructive">No se pudieron cargar las búsquedas. No es un conteo de cero.</p>
      <button onClick={() => refetch()} className="text-sm text-primary">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-4 mt-3 pb-24">
      <SearchAnalyticsDateFilter value={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Search className="w-3.5 h-3.5" /> Búsquedas
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{isLoading ? '…' : data?.totalSearches ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Términos repetidos
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{isLoading ? '…' : data?.repeatedTermCount ?? 0}</p>
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
        El total incluye todas las búsquedas del período. La lista principal muestra solo términos repetidos.
        {singleTermCount > 0
          ? ` Se muestran aparte ${singleTermCount} término${singleTermCount === 1 ? '' : 's'} con una sola búsqueda.`
          : ''}
      </p>

      {singleTermCount > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setSinglesOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-muted-foreground"
          >
            <span>Ver búsquedas de un solo uso ({singleTermCount})</span>
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

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
          className="w-full py-2 text-xs text-primary disabled:opacity-50">
          {isFetchingNextPage ? 'Cargando…' : 'Cargar más términos'}
        </button>
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
            disabled={cleaning || singleTermCount === 0}
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
        Las búsquedas requieren sesión iniciada. Este panel muestra únicamente términos y cantidades, sin identificar a las personas. Los registros históricos acumulados se filtran por su última fecha registrada. Las vistas de productos son acumuladas, sin filtro de fecha.
      </p>
    </div>
  );
}