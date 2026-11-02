import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function RefundNotesDialog({ open, onOpenChange, mode, orderNumber, loading, onConfirm }) {
  const [notes, setNotes] = useState('');
  const isFail = mode === 'fail';

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-sm rounded-2xl p-0 gap-0 overflow-hidden" translate="no">
        <DialogHeader className="px-5 pt-5 pb-1 text-left">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isFail ? 'bg-destructive/10' : 'bg-success/10'}`}>
            {isFail
              ? <XCircle className="w-5 h-5 text-destructive" />
              : <CheckCircle2 className="w-5 h-5 text-success" />}
          </div>
          <DialogTitle className="text-base font-bold">
            {isFail ? 'Marcar reembolso como fallido' : 'Marcar reembolso como procesado'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isFail
              ? 'Escribe el motivo por el que no se pudo devolver el dinero.'
              : 'Escribe una nota interna (opcional).'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-2">
          {orderNumber && (
            <p className="text-[11px] text-muted-foreground">Pedido #{orderNumber}</p>
          )}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isFail ? 'Motivo del fallo' : 'Notas (opcional)'}
            rows={3}
            className="resize-none text-sm"
            disabled={loading}
          />
        </div>

        <DialogFooter className="px-5 pb-5 pt-0 flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className={`flex-1 h-10 ${isFail ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'} text-white`}
            onClick={() => onConfirm(notes.trim())}
            disabled={loading || (isFail && !notes.trim())}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFail ? 'Confirmar fallo' : 'Confirmar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}