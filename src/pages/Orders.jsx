import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/shop/BottomNav';
import OrderStatusBadge from '../components/shop/OrderStatusBadge';
import { Package, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useScrollRestoration } from '../components/useScrollRestoration';

export default function Orders() {
  useScrollRestoration();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', userEmail],
    queryFn: () => base44.entities.Order.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  // Real-time subscription: refresh orders list when any order changes
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top">
        <h1 className="text-lg font-bold text-foreground">My Orders</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold text-lg mb-1">No orders yet</p>
          <p className="text-muted-foreground text-sm">Your order history will appear here</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {orders.map((order, i) => (
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
                    {order.items?.map(i => i.product_name).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy') : ''}
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