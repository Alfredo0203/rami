import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function InvoicePDF({ orderId }) {
  const [pdfData, setPdfData] = useState(null);
  const [fileName, setFileName] = useState('factura.pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const handleView = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await base44.functions.invoke('generateOrderPDF', { orderId });
      if (res.data?.success && res.data?.pdfData) {
        setPdfData(res.data.pdfData);
        if (res.data?.fileName) {
          setFileName(`${res.data.fileName}.pdf`);
        }
        setOpen(true);
      } else if (res.data?.error) {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData) return;
    const link = document.createElement('a');
    link.href = pdfData;
    link.download = fileName;
    link.click();
  };

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={handleView}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground gap-2 h-12 text-sm font-semibold rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando factura...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Ver Factura
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-bold">Factura</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {pdfData && (
              <iframe
                src={pdfData}
                className="w-full h-full border-0"
                title="Vista previa de factura"
              />
            )}
          </div>
          <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleDownload}
              className="h-10 rounded-lg gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}