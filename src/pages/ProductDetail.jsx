import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, ShoppingCart, Heart, Minus, Plus, Check, Share2, Truck, Shield, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e, images) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) setCurrentImage(i => Math.min(i + 1, images.length - 1));
    else setCurrentImage(i => Math.max(i - 1, 0));
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => base44.entities.Product.filter({ id: productId }),
    select: (data) => data[0],
    enabled: !!productId,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
    enabled: !!isAuthenticated,
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const existingItem = cartItems.find(item => item.product_id === productId);
      if (existingItem) {
        return base44.entities.CartItem.update(existingItem.id, {
          quantity: existingItem.quantity + quantity
        });
      }
      return base44.entities.CartItem.create({
        product_id: productId,
        quantity,
        product_name: product.name,
        product_image: product.images?.[0] || '',
        product_price: product.price,
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const prev = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old = []) => {
        const existing = old.find(i => i.product_id === productId);
        if (existing) {
          return old.map(i => i.product_id === productId ? { ...i, quantity: i.quantity + quantity } : i);
        }
        return [...old, {
          id: `opt-${Date.now()}`,
          product_id: productId,
          quantity,
          product_name: product.name,
          product_image: product.images?.[0] || '',
          product_price: product.price,
        }];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && queryClient.setQueryData(['cart'], ctx.prev),
    onSuccess: () => toast.success('Added to cart!'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg flex items-center justify-between px-4 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setLiked(!liked)} className="p-2 bg-secondary rounded-full">
            <Heart className={`w-5 h-5 ${liked ? 'fill-sale text-sale' : 'text-foreground'}`} />
          </button>
          <button
            onClick={() => navigate(createPageUrl('Cart'))}
            className="p-2 bg-secondary rounded-full relative"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Image gallery */}
      <div
        className="relative aspect-square bg-card overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, images)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={images[currentImage]}
            alt={product.name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentImage ? 'bg-primary w-5' : 'bg-primary-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-sale text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            -{discount}% OFF
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImage(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === currentImage ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product info */}
      <div className="px-4 pt-3 space-y-4">
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-extrabold text-primary">${product.price?.toFixed(2)}</span>
            {discount > 0 && (
              <span className="text-sm text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
            )}
          </div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{product.name}</h1>
        </div>

        {/* Rating and sold */}
        <div className="flex items-center gap-3">
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-semibold text-foreground">{product.rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
            </div>
          )}
          {product.sold_count > 0 && (
            <span className="text-xs text-muted-foreground">{product.sold_count}+ sold</span>
          )}
          {product.stock > 0 ? (
            <span className="text-xs text-success font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> In Stock
            </span>
          ) : (
            <span className="text-xs text-destructive font-medium">Out of Stock</span>
          )}
        </div>

        {/* Features */}
        <div className="flex gap-4 py-3 border-t border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>Free Shipping</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Buyer Protection</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>Easy Returns</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-0 bg-secondary rounded-full">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2.5 rounded-full"
            >
              <Minus className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-sm font-bold w-8 text-center text-foreground">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2.5 rounded-full"
            >
              <Plus className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <Button
            onClick={() => addToCartMutation.mutate()}
            disabled={addToCartMutation.isPending || product.stock === 0}
            className="flex-1 bg-primary text-primary-foreground font-bold h-12 rounded-full text-base"
          >
            {addToCartMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}