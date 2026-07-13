import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

const paymentLabels = {
  credit_card: 'Tarjeta de Crédito',
  cash_on_delivery: 'Efectivo (contra entrega)',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
};

const statusLabels = {
  pending: 'Pendiente',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function InvoicePreview({ order }) {
  const addr = order.shipping_address || {};
  const items = order.items || [];
  const hasDiscount = (order.discount_amount || 0) > 0;

  return (
    <div className="text-xs space-y-4 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-start pb-3 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-primary">Factura</h2>
          <p className="text-muted-foreground text-[10px]">#{order.order_number || 'N/A'}</p>
        </div>
        <div className="text-right text-[10px] space-y-0.5">
          <p>Fecha: {order.created_date ? new Date(order.created_date).toLocaleDateString('es-SV') : 'N/A'}</p>
          <p>Estado: {statusLabels[order.status] || order.status}</p>
        </div>
      </div>

      {/* Client info */}
      <div>
        <p className="font-bold text-[11px] mb-1">Información del Cliente</p>
        <div className="space-y-0.5 text-muted-foreground">
          <p>Cliente: {order.customer_name || 'N/A'}</p>
          <p>Email: {order.customer_email || 'N/A'}</p>
          {addr.phone && <p>Tel: {addr.phone}</p>}
        </div>
      </div>

      {/* Items */}
      <div>
        <p className="font-bold text-[11px] mb-1">Detalle del Pedido</p>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_28px_56px_56px] gap-2 bg-muted px-2 py-1.5 font-bold text-[10px]">
            <span>Descripción</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">P. Unit.</span>
            <span className="text-right">Total</span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_28px_56px_56px] gap-2 px-2 py-1.5 border-t border-border">
              <span className="line-clamp-2">{item.product_name}{item.variant_name ? ` - ${item.variant_name}` : ''}</span>
              <span className="text-center">{item.quantity}</span>
              <span className="text-right">{fmt(item.price)}</span>
              <span className="text-right font-medium">{fmt(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="ml-auto w-48 space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío:</span>
          <span>{order.shipping_cost === 0 ? 'Gratis' : fmt(order.shipping_cost)}</span>
        </div>
        {hasDiscount && (
          <div className="flex justify-between text-success">
            <span>Descuento{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span>
            <span>-{fmt(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
          <span>Total:</span>
          <span className="text-primary">{fmt(order.total)}</span>
        </div>
      </div>

      {/* Shipping + Payment */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="font-bold text-[11px] mb-1">Envío</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>{addr.full_name || order.customer_name || 'N/A'}</p>
            <p>{[addr.street, addr.house_number].filter(Boolean).join(' #') || 'N/A'}</p>
            <p>{[addr.municipio, addr.departamento].filter(Boolean).join(', ')}</p>
            <p>{addr.country || 'El Salvador'}</p>
          </div>
        </div>
        <div>
          <p className="font-bold text-[11px] mb-1">Pago</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>{paymentLabels[order.payment_method] || order.payment_method || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePDF({ orderId }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['invoice-order', orderId],
    queryFn: () => base44.entities.Order.get(orderId),
    enabled: !!orderId && open,
  });

  const handleDownload = async () => {
    if (!orderId) return;
    try {
      setDownloading(true);
      setError(null);
      const res = await base44.functions.invoke('generateOrderPDF', { orderId });
      if (res.data?.success && res.data?.pdfData) {
        const link = document.createElement('a');
        link.href = res.data.pdfData;
        link.download = res.data.fileName ? `${res.data.fileName}.pdf` : 'factura.pdf';
        link.click();
      } else if (res.data?.error) {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.message || 'Error al generar PDF');
    } finally {
      setDownloading(false);
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
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-primary text-primary-foreground gap-2 h-12 text-sm font-semibold rounded-xl"
      >
        <FileText className="w-4 h-4" />
        Ver Factura
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-bold">Factura #{order?.order_number || ''}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : order ? (
              <InvoicePreview order={order} />
            ) : (
              <p className="text-center text-muted-foreground py-12">No se pudo cargar la factura</p>
            )}
          </div>
          <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-10 rounded-lg">
              Cerrar
            </Button>
            <Button onClick={handleDownload} disabled={downloading || !order} className="h-10 rounded-lg gap-2">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}