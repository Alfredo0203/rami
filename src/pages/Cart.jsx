import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CartItemCard from '../components/shop/CartItemCard';
import { ArrowLeft, ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';

export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const updateQtyMutation = useMutation({
    mutationFn: async ({ item, newQty }) => {
      if (newQty <= 0) return base44.entities.CartItem.delete(item.id);
      return base44.entities.CartItem.update(item.id, { quantity: newQty });
    },
    onMutate: async ({ item, newQty }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const prev = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old = []) =>
        newQty <= 0
          ? old.filter(i => i.id !== item.id)
          : old.map(i => i.id === item.id ? { ...i, quantity: newQty } : i)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && queryClient.setQueryData(['cart'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (item) => base44.entities.CartItem.delete(item.id),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const prev = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old = []) => old.filter(i => i.id !== item.id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && queryClient.setQueryData(['cart'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  // Cargar stock actual del catálogo para validar en carrito
  const { data: catalogData } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog', {}).then(r => r.data),
    enabled: cartItems.length > 0,
  });

  // Cargar variantes activas de productos en carrito que tienen variant_id
  const variantIds = cartItems.map(i => i.variant_id).filter(Boolean);
  const { data: variantsData = [] } = useQuery({
    queryKey: ['cart-variants', variantIds.join(',')],
    queryFn: async () => {
      if (!variantIds.length) return [];
      // Fetch all variants for products in cart
      const productIds = [...new Set(cartItems.filter(i => i.variant_id).map(i => i.product_id))];
      const results = await Promise.all(
        productIds.map(pid => base44.asServiceRole?.entities?.ProductVariant?.filter({ product_id: pid }).catch(() => []))
      );
      return results.flat().filter(Boolean);
    },
    enabled: variantIds.length > 0,
  });

  // Mapa: item.id → { available: number }
  const stockInfoMap = useMemo(() => {
    const map = {};
    const products = catalogData?.products || [];
    for (const item of cartItems) {
      if (item.variant_id) {
        const variant = variantsData.find(v => v.id === item.variant_id);
        map[item.id] = { available: variant?.stock ?? Infinity };
      } else {
        const product = products.find(p => p.id === item.product_id);
        map[item.id] = { available: product?.stock ?? Infinity };
      }
    }
    return map;
  }, [cartItems, catalogData, variantsData]);

  const hasStockIssues = cartItems.some(item => {
    const info = stockInfoMap[item.id];
    return info && info.available !== Infinity && item.quantity > info.available;
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price || 0) * (item.quantity || 0), 0);
  const shipping = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Shopping Cart</h1>
        <span className="text-sm text-muted-foreground">({cartItems.length})</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold text-lg mb-1">Your cart is empty</p>
          <p className="text-muted-foreground text-sm mb-6">Start shopping to add items</p>
          <Button
            onClick={() => navigate(createPageUrl('Home'))}
            className="bg-primary text-primary-foreground rounded-full px-8"
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 space-y-3">
            {hasStockIssues && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-medium">Algunos productos tienen menos stock del que pediste. Ajusta las cantidades antes de continuar.</p>
              </div>
            )}
            <AnimatePresence>
              {cartItems.map(item => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQty={(item, newQty) => updateQtyMutation.mutate({ item, newQty })}
                  onRemove={(item) => removeMutation.mutate(item)}
                  stockInfo={stockInfoMap[item.id]}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Price breakdown */}
          <div className="mx-4 mt-4 bg-card rounded-xl p-4 space-y-2.5 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className={shipping === 0 ? 'text-success font-medium' : 'text-foreground font-medium'}>
                {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            {shipping > 0 && (
              <p className="text-[10px] text-primary">Free shipping on orders over $50!</p>
            )}
            <div className="border-t border-border pt-2.5 flex justify-between">
              <span className="text-foreground font-bold">Total</span>
              <span className="text-foreground font-extrabold text-lg">${total.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      {/* Checkout button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          <Button
            onClick={() => navigate(createPageUrl('Checkout'))}
            disabled={hasStockIssues}
            className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-full text-base max-w-lg mx-auto block disabled:opacity-50"
          >
            Ir a pagar · ${total.toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  );
}