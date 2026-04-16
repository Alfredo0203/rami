import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InvoicePDF({ orderId }) {
  const [pdfData, setPdfData] = useState(null);
  const [fileName, setFileName] = useState('factura.pdf');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        const res = await base44.functions.invoke('generateOrderPDF', { orderId });
        
        if (res.data?.success && res.data?.pdfData) {
          setPdfData(res.data.pdfData);
          if (res.data?.fileName) {
            setFileName(`${res.data.fileName}.pdf`);
          }
        } else if (res.data?.error) {
          setError(res.data.error);
        }
      } catch (err) {
        setError(err.message || 'Error al generar PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [orderId]);

  const downloadPDF = () => {
    if (!pdfData) return;
    
    const link = document.createElement('a');
    link.href = pdfData;
    link.download = fileName;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-card rounded-lg border border-border">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Generando factura...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      {pdfData && (
        <Button
          onClick={downloadPDF}
          className="w-full bg-primary text-primary-foreground gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar Factura PDF
        </Button>
      )}
    </div>
  );
}