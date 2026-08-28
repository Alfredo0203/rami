import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/shop/BottomNav';
import OrderStatusBadge from '../components/shop/OrderStatusBadge';
import { Package, ChevronRight, Loader2, AlertTriangle, Filter, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateSV } from '@/lib/dateUtils';
import { motion } from 'framer-motion';
import { useScrollRestoration } from '../components/useScrollRestoration';
import { useTranslation } from '../components/i18n/useTranslation';
import { toast } from 'sonner';

export default function Orders() {
  useScrollRestoration();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [requestingReactivation, setRequestingReactivation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const STATUS_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'processing', label: 'Procesando' },
    { value: 'shipped', label: 'Enviados' },
    { value: 'delivered', label: 'Entregados' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserEmail(u?.email);
      setUserStatus(u?.status);
    }).catch(() => {});
  }, []);

  const handleRequestReactivation = async () => {
    try {
      setRequestingReactivation(true);
      await base44.functions.invoke('requestAccountReactivation', {});
      toast.success('Email de reactivación enviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Error al solicitar reactivación';
      toast.error(errorMsg);
    } finally {
      setRequestingReactivation(false);
    }
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', userEmail],
    queryFn: () => base44.entities.Order.filter({ customer_email: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  useEffect(() => {
    const unsub = base44.entities.Order.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['orders', userEmail] });
    });
    return unsub;
  }, [queryClient, userEmail]);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">{t('orders_title')}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(createPageUrl('Cart'))}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-secondary text-foreground active:scale-95 transition-transform"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            {orders.length > 0 && (
              <button
                onClick={() => setShowFilters(s => !s)}
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-1 px-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setStatusFilter('all')}
                className="shrink-0 p-1.5 rounded-full bg-destructive/10 text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {userStatus === 'deactivated' && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Tu cuenta está desactivada</p>
            <p className="text-xs text-destructive/80 mt-1">Puedes ver tu historial de órdenes, pero necesitas reactivar tu cuenta para hacer nuevas compras.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestReactivation}
              disabled={requestingReactivation}
              className="mt-3 text-xs h-7 border-destructive/20 text-destructive hover:bg-destructive/5"
            >
              {requestingReactivation && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Reactivar cuenta
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold text-lg mb-1">{t('orders_empty_title')}</p>
          <p className="text-muted-foreground text-sm">{t('orders_empty_subtitle')}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-3">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold mb-1">No hay pedidos con este filtro</p>
          <p className="text-muted-foreground text-sm mb-4">Prueba con otro estado</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="rounded-full"
          >
            Ver todos los pedidos
          </Button>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(createPageUrl('OrderDetail') + `?id=${order.id}`)}
              className="bg-card rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{order.order_number}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                      alt={item.product_name}
                      className="w-10 h-10 rounded-lg object-cover border-2 border-card"
                    />
                  ))}
                  {(order.items?.length || 0) > 3 && (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border-2 border-card text-xs font-bold text-muted-foreground">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {order.items?.map(item => item.product_name).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.created_date ? formatDateSV(order.created_date) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-foreground">${order.total?.toFixed(2)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav cartCount={cartCount} />
    </div>
  );
}