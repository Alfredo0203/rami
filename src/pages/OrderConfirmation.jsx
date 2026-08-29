import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle2, Package, ArrowRight, Loader2, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import InvoicePDF from '@/components/shop/InvoicePDF';
import { toast } from 'sonner';

export default function OrderConfirmation() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const paymentParam = urlParams.get('payment');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.get(orderId),
    enabled: !!orderId,
  });

  const isPending = paymentParam === 'pending';

  // Si Stripe o Wompi redirigieron con payment=success, confirmar la orden
  React.useEffect(() => {
    if (paymentParam === 'success' && orderId && order && order.payment_status !== 'paid') {
      const method = urlParams.get('method') || 'stripe';
      // Usar confirmOrder para manejar inventario, cupones, carrito y notificaciones
      base44.functions.invoke('confirmOrder', {
        orderId,
        paymentTransactionId: method === 'wompi' ? `wompi-${orderId}` : undefined,
      })
        .then(() => {
          // Invalidar cache del carrito para que se refleje la limpieza
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
        })
        .catch(console.error);
    }
  }, [paymentParam, orderId, order]);

  const handleRetryPayment = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const linkRes = await base44.functions.invoke('createWompiPaymentLink', {
        orderId: order.id,
        amount: order.total,
        orderNumber: order.order_number,
      });
      if (linkRes.data?.error) throw new Error(linkRes.data.error);
      const url = linkRes.data?.urlEnlace;
      if (!url) throw new Error('No se obtuvo enlace de pago');
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || 'Error al reintentar pago');
      setRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Estado: pago pendiente (el usuario volvió de Wompi sin completar)
  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mb-6"
        >
          <Clock className="w-10 h-10 text-warning" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-2xl font-extrabold text-foreground mb-2">Pago Pendiente</h1>
          <p className="text-muted-foreground text-sm mb-1">Tu orden fue creada pero el pago no se completó</p>
          {order && (
            <p className="text-xs text-muted-foreground">
              Pedido #{order.order_number}
            </p>
          )}
        </motion.div>

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-sm space-y-4 mt-6"
          >
            {/* Order Details */}
            <div className="bg-card rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Detalle del Pedido</span>
              </div>
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
                  <span className="text-foreground font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border mt-2 pt-2 flex justify-between text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3 mt-8 w-full max-w-sm"
        >
          <Button
            onClick={handleRetryPayment}
            disabled={retrying || !order}
            className="bg-primary text-primary-foreground rounded-full h-12 font-bold"
          >
            {retrying ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5 mr-2" /> Reintentar Pago</>}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('Orders'))}
            className="rounded-full h-12 font-medium"
          >
            Ver Mis Pedidos
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-success" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h1 className="text-2xl font-extrabold text-foreground mb-2">¡Pedido Realizado!</h1>
        <p className="text-muted-foreground text-sm mb-1">Gracias por tu compra</p>
        {order && (
          <p className="text-xs text-muted-foreground">
            Pedido #{order.order_number}
          </p>
        )}
      </motion.div>

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm space-y-4 mt-6"
        >
          {/* Invoice PDF */}
          <InvoicePDF orderId={orderId} />

          {/* Order Details */}
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Detalle del Pedido</span>
            </div>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
                <span className="text-foreground font-medium">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border mt-2 pt-2 flex justify-between text-base font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 mt-8 w-full max-w-sm"
      >
        <Button
          onClick={() => navigate(createPageUrl('Orders'))}
          className="bg-primary text-primary-foreground rounded-full h-12 font-bold"
        >
          Ver Mis Pedidos <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Home'))}
          className="rounded-full h-12 font-medium"
        >
          Seguir Comprando
        </Button>
      </motion.div>
    </div>
  );
}