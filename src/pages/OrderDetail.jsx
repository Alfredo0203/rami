import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OrderStatusBadge from '../components/shop/OrderStatusBadge';
import OrderStatusTimeline from '../components/shop/OrderStatusTimeline';
import { ArrowLeft, MapPin, CreditCard, Package, Truck, CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { formatDateTimeSV } from '@/lib/dateUtils';
import InvoicePDF from '../components/shop/InvoicePDF';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const steps = [
  { key: 'pending', icon: Clock, label: 'Pedido realizado' },
  { key: 'processing', icon: Package, label: 'En proceso' },
  { key: 'shipped', icon: Truck, label: 'Enviado' },
  { key: 'delivered', icon: CheckCircle2, label: 'Entregado' },
];

const stepOrder = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reordering, setReordering] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }),
    select: (data) => data[0],
    enabled: !!orderId,
  });

  // Real-time subscription: update this order when its status changes
  useEffect(() => {
    if (!orderId) return;
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.id === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    });
    return unsub;
  }, [orderId, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pedido no encontrado</p>
      </div>
    );
  }

  const currentStepIdx = stepOrder.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  // Lógica de cancelación según método de pago
  const isOnlinePayment = order.payment_method === 'credit_card';
  const orderAgeHours = order.created_date
    ? (Date.now() - new Date(order.created_date).getTime()) / (1000 * 60 * 60)
    : 0;
  const within24h = orderAgeHours <= 24;
  const hoursLeft = Math.max(0, 24 - orderAgeHours);

  const canCancel = ['pending', 'processing'].includes(order.status) &&
    (!isOnlinePayment || within24h);

  const cancelBlockedByTime = isOnlinePayment && !within24h &&
    ['pending', 'processing'].includes(order.status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await base44.functions.invoke('cancelOrder', { orderId });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    } catch (e) {
      alert(e.message || 'Error al cancelar el pedido');
    }
    setCancelling(false);
  };

  const handleReorder = async () => {
    setReordering(true);
    const existingCart = await base44.entities.CartItem.list();
    for (const item of (order.items || [])) {
      const existing = existingCart.find(c => c.product_id === item.product_id);
      if (existing) {
        await base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + item.quantity });
      } else {
        await base44.entities.CartItem.create({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          product_price: item.price,
          quantity: item.quantity,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    setReordering(false);
    navigate(createPageUrl('Cart'));
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">Pedido {order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {order.created_date ? formatDateTimeSV(order.created_date) : ''}
          </p>
        </div>
        <div className="ml-auto"><OrderStatusBadge status={order.status} /></div>
      </div>

      {/* Reorder & PDF buttons */}
      <div className="px-4 pt-4 space-y-3">
        <button
          onClick={handleReorder}
          disabled={reordering}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-60 transition-opacity"
        >
          {reordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          {reordering ? 'Agregando al carrito…' : 'Volver a pedir'}
        </button>
        <InvoicePDF orderId={orderId} />
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={cancelling}
                className="w-full flex items-center justify-center gap-2 py-3 border border-destructive text-destructive rounded-xl font-semibold text-sm disabled:opacity-60 transition-opacity"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {cancelling ? 'Cancelando…' : 'Cancelar pedido'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isOnlinePayment && order.payment_status === 'paid'
                    ? 'Se procesará un reembolso automático a tu tarjeta. Puede tardar 5-10 días hábiles en reflejarse.'
                    : 'Esta acción no se puede deshacer. El pedido será marcado como cancelado y el stock será restaurado.'}
                  {isOnlinePayment && within24h && (
                    <span className="block mt-1 text-warning font-medium">
                      Tiempo restante para cancelar: {Math.floor(hoursLeft)}h {Math.round((hoursLeft % 1) * 60)}min
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mantener pedido</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {cancelBlockedByTime && (
          <div className="w-full flex items-center gap-2 py-3 px-4 border border-border rounded-xl text-sm text-muted-foreground bg-secondary">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>El plazo de 24h para cancelar con tarjeta ha expirado. Contacta soporte.</span>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tracking */}
        {!isCancelled && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Seguimiento del Pedido</h2>
              <span className="flex items-center gap-1.5 text-[10px] text-success font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
                Live
              </span>
            </div>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-border" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-primary transition-all"
                style={{ width: `${Math.max(0, currentStepIdx) / (steps.length - 1) * (100 - 12)}%` }}
              />
              {steps.map((step, i) => {
                const isCompleted = i <= currentStepIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {order.tracking_number && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                Tracking: <span className="text-foreground font-medium">{order.tracking_number}</span>
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground mb-3">Productos</h2>
          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex gap-3">
                <img
                  src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                  alt={item.product_name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className={order.shipping_cost === 0 ? 'text-success' : 'text-foreground'}>
                {order.shipping_cost === 0 ? 'GRATIS' : `$${order.shipping_cost?.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary text-lg">${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Dirección de Envío</h2>
            </div>
            <p className="text-sm text-foreground">{order.shipping_address.full_name}</p>
            <p className="text-xs text-muted-foreground">{order.shipping_address.street}</p>
            <p className="text-xs text-muted-foreground">
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
            </p>
          </div>
        )}

        {/* Payment */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Pago</h2>
          </div>
          <p className="text-sm text-foreground">
            {order.payment_method === 'credit_card' && 'Tarjeta de Crédito'}
            {order.payment_method === 'cash_on_delivery' && 'Efectivo'}
            {order.payment_method === 'paypal' && 'PayPal'}
            {order.payment_method === 'apple_pay' && 'Apple Pay'}
          </p>
        </div>

        {/* Status history */}
         <div className="bg-card rounded-xl p-4 shadow-sm">
           <OrderStatusTimeline orderId={orderId} />
         </div>
      </div>
    </div>
  );
}