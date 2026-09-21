import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import OrderStatusBadge from '../shop/OrderStatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDateSV } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Phone, MapPin, Mail, Package, CreditCard, StickyNote, Truck, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const NON_CANCELLABLE = ['delivered', 'cancelled'];

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Tarjeta de Crédito / Débito',
  wompi: 'Tarjeta de Crédito / Débito',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  cash_on_delivery: 'Pago contra entrega',
};

const PAYMENT_STATUS_LABELS = {
  paid: 'Pagado',
  pending_payment: 'Pago pendiente',
  failed: 'Pago fallido',
};

export default function AdminOrderDetailModal({ order, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);

  const isOnlinePayment = order?.payment_method === 'wompi' || order?.payment_method === 'credit_card';
  const isPaymentPending = order?.payment_status === 'pending_payment';

  const updateMutation = useMutation({
    mutationFn: ({ newStatus, extraFields }) =>
      base44.functions.invoke('updateOrderStatus', { orderId: order.id, newStatus, extraFields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Pedido actualizado');
    },
    onError: (err) => toast.error(err?.message || 'Error al actualizar el pedido'),
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'cancelled' && NON_CANCELLABLE.includes(order.status)) {
      toast.error('No se puede cancelar un pedido ya entregado o cancelado');
      return;
    }
    // Bloquear avance de estado si el pago online está pendiente
    if (isOnlinePayment && isPaymentPending && ['processing', 'shipped', 'delivered'].includes(newStatus)) {
      toast.error('No se puede avanzar el estado: el pago está pendiente. Verifica o confirma el pago primero.');
      return;
    }
    const extraFields = {};
    if (newStatus === 'shipped' && !order.tracking_number) {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      extraFields.tracking_number = 'RA-' + ts + rand;
    }
    updateMutation.mutate({ newStatus, extraFields });
  };

  const handleVerifyPayment = async () => {
    setVerifying(true);
    try {
      const res = await base44.functions.invoke('verifyWompiPayment', { orderId: order.id });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.alreadyPaid) {
        toast.info('El pago ya estaba confirmado');
      } else if (res.data?.approved) {
        toast.success('¡Pago verificado y confirmado en Wompi!');
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      } else {
        toast.warning(res.data?.message || 'No se encontró pago aprobado en Wompi');
      }
    } catch (err) {
      toast.error(err?.message || 'Error al verificar el pago');
    } finally {
      setVerifying(false);
    }
  };

  const saveTracking = (val) => {
    if (val !== (order.tracking_number || '')) {
      base44.entities.Order.update(order.id, { tracking_number: val })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Nº de rastreo guardado'); });
    }
  };

  const saveCarrier = (val) => {
    if (val !== (order.carrier || '')) {
      base44.entities.Order.update(order.id, { carrier: val })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Transportista guardado'); });
    }
  };

  const saveInternalNotes = (val) => {
    if (val !== (order.internal_notes || '')) {
      base44.entities.Order.update(order.id, { internal_notes: val })
        .then(() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }));
    }
  };

  if (!order) return null;
  const addr = order.shipping_address || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto p-0">
        <SheetHeader className="flex flex-row items-center justify-between pr-8 px-5 pt-4 pb-2 sticky top-0 bg-card z-10 border-b border-border">
          <SheetTitle className="text-base">Detalles del Pedido</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="p-1.5 bg-secondary rounded-full">
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Header info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{order.order_number}</p>
              <p className="text-xs text-muted-foreground">
                {order.created_date ? formatDateSV(order.created_date) : ''}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Customer info */}
          <div className="bg-secondary rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground mb-1">Cliente</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-foreground">{order.customer_name || '—'}</p>
            </div>
            {order.customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-foreground">{order.customer_email}</p>
              </div>
            )}
            {addr.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-foreground">{addr.phone}</p>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {addr.street && (
            <div className="bg-secondary rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Dirección de envío</p>
              </div>
              <p className="text-xs text-foreground">{addr.full_name}</p>
              <p className="text-xs text-muted-foreground">{addr.street}</p>
              {(addr.house_number || addr.colonia) && (
                <p className="text-xs text-muted-foreground">
                  {[addr.house_number, addr.colonia].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {[addr.municipio, addr.departamento, addr.zip_code, addr.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Items - the key section for knowing what to ship */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Productos a enviar ({order.items?.length || 0})
              </p>
            </div>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex gap-3 bg-card border border-border rounded-xl p-3">
                  <img
                    src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120'}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">Variante: {item.variant_name}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        Cantidad: <span className="font-semibold text-foreground">{item.quantity}</span>
                      </p>
                      <p className="text-sm font-bold text-primary">
                        ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${item.price?.toFixed(2)} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-secondary rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${order.subtotal?.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Descuento {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                <span className="text-success">-${order.discount_amount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-foreground">{order.shipping_cost > 0 ? `$${order.shipping_cost?.toFixed(2)}` : 'Gratis'}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-border">
              <span className="text-foreground">Total</span>
              <span className="text-primary">${order.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-secondary rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Pago</p>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Método</span>
              <span className="text-foreground">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Estado del pago</span>
              <span className={`font-medium ${order.payment_status === 'paid' ? 'text-success' : order.payment_status === 'failed' ? 'text-destructive' : 'text-warning'}`}>
                {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status || '—'}
              </span>
            </div>
            {order.payment_transaction_id && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Transacción</span>
                <span className="text-foreground text-[10px] truncate max-w-[160px]">{order.payment_transaction_id}</span>
              </div>
            )}
          </div>

          {/* Pending payment warning + verify button */}
          {isOnlinePayment && isPaymentPending && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-warning">Pago pendiente</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Este pedido no ha sido pagado. No se puede avanzar el estado hasta confirmar el pago.
                  </p>
                </div>
              </div>
              <button
                onClick={handleVerifyPayment}
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 h-9 bg-warning text-white rounded-lg text-xs font-semibold disabled:opacity-60"
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {verifying ? 'Verificando en Wompi…' : 'Verificar pago en Wompi'}
              </button>
            </div>
          )}

          {/* Payment confirmed badge */}
          {order.payment_status === 'paid' && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs font-semibold text-success">Pago confirmado</p>
            </div>
          )}

          {/* Customer notes */}
          {order.customer_notes && (
            <div className="bg-secondary rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Notas del cliente</p>
              </div>
              <p className="text-xs text-foreground">{order.customer_notes}</p>
            </div>
          )}

          {/* Tracking & carrier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Envío</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nº de rastreo"
                defaultValue={order.tracking_number || ''}
                onBlur={(e) => saveTracking(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Input
                placeholder="Transportista"
                defaultValue={order.carrier || ''}
                onBlur={(e) => saveCarrier(e.target.value)}
                className="h-9 text-xs flex-1"
              />
            </div>
          </div>

          {/* Status change */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Cambiar estado</p>
            <Select
              value={order.status}
              onValueChange={handleStatusChange}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="processing">En proceso</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                {!NON_CANCELLABLE.includes(order.status) && (
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                )}
                {order.status === 'cancelled' && (
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Notas internas (solo admin)</p>
            <Textarea
              placeholder="Agrega notas internas sobre este pedido..."
              defaultValue={order.internal_notes || ''}
              onBlur={(e) => saveInternalNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}