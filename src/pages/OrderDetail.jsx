import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import OrderStatusBadge from '../components/shop/OrderStatusBadge';
import { ArrowLeft, MapPin, CreditCard, Package, Truck, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const steps = [
  { key: 'pending', icon: Clock, label: 'Order Placed' },
  { key: 'processing', icon: Package, label: 'Processing' },
  { key: 'shipped', icon: Truck, label: 'Shipped' },
  { key: 'delivered', icon: CheckCircle2, label: 'Delivered' },
];

const stepOrder = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const currentStepIdx = stepOrder.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">Order {order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}
          </p>
        </div>
        <div className="ml-auto"><OrderStatusBadge status={order.status} /></div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tracking */}
        {!isCancelled && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Order Tracking</h2>
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
          <h2 className="text-sm font-bold text-foreground mb-3">Items</h2>
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
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
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
              <span className="text-muted-foreground">Shipping</span>
              <span className={order.shipping_cost === 0 ? 'text-success' : 'text-foreground'}>
                {order.shipping_cost === 0 ? 'FREE' : `$${order.shipping_cost?.toFixed(2)}`}
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
              <h2 className="text-sm font-bold text-foreground">Shipping Address</h2>
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
            <h2 className="text-sm font-bold text-foreground">Payment</h2>
          </div>
          <p className="text-sm text-foreground capitalize">{order.payment_method?.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
}