import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InvoicePDF({ orderId }) {
  const [pdfData, setPdfData] = useState(null);
  const [fileName, setFileName] = useState('factura.pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePDF = async () => {
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
        // Auto-download
        const link = document.createElement('a');
        link.href = res.data.pdfData;
        link.download = `${res.data.fileName || 'factura'}.pdf`;
        link.click();
      } else if (res.data?.error) {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <Button
      onClick={generatePDF}
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
          <Download className="w-4 h-4" />
          Descargar Factura
        </>
      )}
    </Button>
  );
}