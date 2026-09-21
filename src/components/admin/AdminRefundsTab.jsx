import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function AdminRefundsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: () => base44.entities.RefundRequest.list('-created_date'),
  });

  const markProcessed = useMutation({
    mutationFn: ({ id, notes }) =>
      base44.entities.RefundRequest.update(id, {
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: 'admin',
        admin_notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success('Reembolso marcado como procesado');
    },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const markFailed = useMutation({
    mutationFn: ({ id, notes }) =>
      base44.entities.RefundRequest.update(id, {
        status: 'failed',
        processed_at: new Date().toISOString(),
        processed_by: 'admin',
        admin_notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      toast.success('Reembolso marcado como fallido');
    },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const filtered = refunds.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = refunds.filter(r => r.status === 'pending').length;

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Pendiente</span>;
    if (status === 'processed') return <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Procesado</span>;
    if (status === 'failed') return <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Fallido</span>;
    return null;
  };

  return (
    <div className="space-y-3 mt-3">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {[
          ['pending', `Pendientes${pendingCount ? ` (${pendingCount})` : ''}`],
          ['processed', 'Procesados'],
          ['failed', 'Fallidos'],
          ['all', 'Todos'],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              filter === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            {filter === 'pending' ? 'No hay reembolsos pendientes' : 'No hay reembolsos en este filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(refund => (
            <div key={refund.id} className="bg-card rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">#{refund.order_number || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{refund.customer_name || ''}</p>
                  <p className="text-[10px] text-muted-foreground">{refund.customer_email || ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-base font-bold text-destructive">${Number(refund.amount || 0).toFixed(2)}</span>
                  {statusBadge(refund.status)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-secondary rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                <span className="truncate">
                  {refund.payment_method?.toUpperCase()} · TX: {refund.payment_transaction_id || 'N/A'}
                </span>
              </div>

              {refund.admin_notes && (
                <p className="text-[11px] text-muted-foreground italic border-l-2 border-border pl-2">
                  {refund.admin_notes}
                </p>
              )}

              {refund.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const notes = prompt('Notas (opcional):', '');
                      if (notes === null) return;
                      markProcessed.mutate({ id: refund.id, notes });
                    }}
                    className="flex-1 bg-success text-white hover:bg-success/90 h-8 text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar procesado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const notes = prompt('Motivo del fallo:', '');
                      if (notes === null) return;
                      markFailed.mutate({ id: refund.id, notes });
                    }}
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-8 text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Fallido
                  </Button>
                </div>
              )}

              {refund.processed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Procesado: {new Date(refund.processed_at).toLocaleString('es-SV')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}