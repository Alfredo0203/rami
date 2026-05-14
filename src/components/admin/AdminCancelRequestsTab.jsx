import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  pending_review: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const TYPE_LABELS = {
  cancel_request: 'Cancelación',
  refund_request: 'Reembolso',
  return_request: 'Devolución',
};

export default function AdminCancelRequestsTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['cancel_requests'],
    queryFn: () => base44.entities.CancelRequest.list('-created_date', 100),
  });

  const updateRequest = async (requestId, status, notes, refundId = null) => {
    await base44.entities.CancelRequest.update(requestId, {
      status,
      admin_notes: notes,
      resolved_at: new Date().toISOString(),
      ...(refundId ? { stripe_refund_id: refundId } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['cancel_requests'] });
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      let refundId = null;
      const needsRefund =
        selected.payment_status === 'paid' &&
        selected.payment_transaction_id &&
        selected.payment_method !== 'cash_on_delivery';

      if (needsRefund) {
        const res = await base44.functions.invoke('processManualRefund', {
          payment_transaction_id: selected.payment_transaction_id,
          order_id: selected.order_id,
          order_number: selected.order_number,
        });
        refundId = res?.data?.refund_id || null;
      }

      // Si es cancel_request, cancelar la orden real
      if (selected.request_type === 'cancel_request') {
        await base44.entities.Order.update(selected.order_id, {
          status: 'cancelled',
          internal_notes: refundId ? `Reembolso manual Stripe: ${refundId}` : 'Cancelado por admin tras solicitud manual',
        });
      }

      await updateRequest(selected.id, 'approved', adminNotes, refundId);
      toast.success(`Solicitud aprobada${refundId ? ' y reembolso procesado' : ''}`);
      setSelected(null);
      setAdminNotes('');
    } catch (err) {
      toast.error('Error al aprobar: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await updateRequest(selected.id, 'rejected', adminNotes);
      toast.success('Solicitud rechazada');
      setSelected(null);
      setAdminNotes('');
    } catch (err) {
      toast.error('Error al rechazar: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const pending = requests.filter(r => r.status === 'pending_review');
  const resolved = requests.filter(r => r.status !== 'pending_review');

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando solicitudes...</div>;

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Pendientes de revisión ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(r => (
              <RequestCard key={r.id} request={r} onReview={() => { setSelected(r); setAdminNotes(''); }} />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          No hay solicitudes pendientes
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h3 className="font-semibold text-muted-foreground mb-3 text-sm">Historial ({resolved.length})</h3>
          <div className="space-y-2">
            {resolved.map(r => (
              <RequestCard key={r.id} request={r} onReview={() => { setSelected(r); setAdminNotes(r.admin_notes || ''); }} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAdminNotes(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar solicitud — Orden #{selected?.order_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <div><span className="font-medium">Tipo:</span> {TYPE_LABELS[selected.request_type]}</div>
                <div><span className="font-medium">Cliente:</span> {selected.customer_name} ({selected.customer_email})</div>
                <div><span className="font-medium">Estado de orden:</span> {selected.order_status}</div>
                <div><span className="font-medium">Total:</span> ${selected.order_total?.toFixed(2)}</div>
                <div><span className="font-medium">Pago:</span> {selected.payment_method} — {selected.payment_status}</div>
                {selected.payment_transaction_id && (
                  <div><span className="font-medium">Transaction ID:</span> <code className="text-xs bg-background px-1 rounded">{selected.payment_transaction_id}</code></div>
                )}
                <div><span className="font-medium">Motivo:</span> {selected.reason || 'No especificado'}</div>
              </div>

              {selected.payment_status === 'paid' && selected.payment_method !== 'cash_on_delivery' && selected.status === 'pending_review' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⚠️ Esta orden tiene pago confirmado. Si apruebas, se procesará un reembolso automático en Stripe de <strong>${selected.order_total?.toFixed(2)}</strong>.
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Notas para el cliente (opcional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Ej: Tu solicitud fue aprobada, el reembolso llegará en 5-10 días..."
                  rows={3}
                  disabled={selected.status !== 'pending_review'}
                />
              </div>
            </div>
          )}
          {selected?.status === 'pending_review' && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleReject} disabled={processing}>
                <XCircle className="w-4 h-4 mr-1" /> Rechazar
              </Button>
              <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-1" /> {processing ? 'Procesando...' : 'Aprobar'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ request, onReview }) {
  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending_review;
  const Icon = statusCfg.icon;
  return (
    <div
      className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onReview}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">#{request.order_number}</span>
          <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
          <Badge variant="outline" className="text-xs">{TYPE_LABELS[request.request_type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {request.customer_name} · ${request.order_total?.toFixed(2)} · {request.order_status}
        </p>
      </div>
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
}