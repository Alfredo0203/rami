import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, ShoppingCart, Heart, Minus, Plus, Check, Truck, Shield, RotateCcw, Loader2, AlertCircle, X, ZoomIn } from 'lucide-react';
import ProductReviews from '@/components/shop/ProductReviews';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/lib/useCurrentUser';
import VariantSelector from '@/components/shop/VariantSelector';
import RelatedProducts from '@/components/shop/RelatedProducts';
import { useSEO } from '@/hooks/useSEO';
import ProductShare from '@/components/shop/ProductShare';

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const preselectedVariantId = urlParams.get('variant_id');
  const preselectedQty = parseInt(urlParams.get('qty') || '1', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isGuest } = useCurrentUser();
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(preselectedQty);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttrMap, setSelectedAttrMap] = useState({});
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e, images) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) setCurrentImage(i => Math.min(i + 1, images.length - 1));
    else setCurrentImage(i => Math.max(i - 1, 0));
  };

  const { data, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () =>
      base44.functions.invoke('getPublicProduct', { product_id: productId }).then(r => r.data),
    enabled: !!productId,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list().catch(() => []),
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist', user?.email],
    queryFn: async () => {
      if (isGuest) return [];
      try {
        const items = await base44.entities.Wishlist.filter({ user_email: user.email });
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    enabled: !isGuest && !!user?.email,
  });

  const wishlistItem = wishlistItems.find(w => w.product_id === productId);
  const isWishlisted = !!wishlistItem;

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        return base44.entities.Wishlist.delete(wishlistItem.id);
      }
      return base44.entities.Wishlist.create({
        product_id: productId,
        user_email: user.email,
        product_name: product?.name,
        product_image: product?.images?.[0] || '',
        product_price: product?.price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(isWishlisted ? 'Eliminado de favoritos' : 'Guardado en favoritos');
    },
  });

  const product = data?.product;
  const variants = data?.variants || [];
  const hasVariants = variants.length > 0;

  // SEO: Update meta tags for social sharing (before early returns)
  const productUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?id=${productId}` : '';
  useSEO({
    title: `${product?.name} - Tienda`,
    description: product?.description || `Compra ${product?.name} en nuestra tienda en línea`,
    image: product?.images?.[0],
    url: productUrl,
    type: 'product',
  });

  // Al seleccionar una variante con imagen, cambiar la imagen principal
  // Auto-select variant: only if coming from cart (variant_id in URL) or product is already in cart
  // Using refs to track if we've already done the initial selection
  const initialSelectionDone = useRef(false);

  useEffect(() => {
    // Reset when product changes
    if (productId) {
      initialSelectionDone.current = false;
    }
  }, [productId]);

  useEffect(() => {
    // Skip if no variants, already selected, or initial selection already done
    if (variants.length === 0 || initialSelectionDone.current) return;

    let variantToSelect = null;
    let shouldSyncQty = false;

    // 1. Preselected via URL param (coming from cart)
    if (preselectedVariantId) {
      variantToSelect = variants.find(v => v.id === preselectedVariantId);
    }

    // 2. Product already in cart — preselect the variant that's in cart
    if (!variantToSelect) {
      const cartVariant = cartItems.find(item => item.product_id === productId && item.variant_id);
      if (cartVariant) {
        variantToSelect = variants.find(v => v.id === cartVariant.variant_id);
        shouldSyncQty = true;
      }
    }

    // Apply selection if found
    if (variantToSelect) {
      initialSelectionDone.current = true;
      setSelectedVariant(variantToSelect);
      
      // Sync attribute map
      if (variantToSelect.attributes) {
        const map = {};
        variantToSelect.attributes.forEach(a => { 
          if (a.key && a.values?.[0]) map[a.key] = a.values[0]; 
        });
        setSelectedAttrMap(map);
      }
      
      // Sync image
      if (variantToSelect.image_url && product?.images) {
        const variantImgIndex = product.images.indexOf(variantToSelect.image_url);
        setCurrentImage(variantImgIndex >= 0 ? variantImgIndex : -1);
      }
      
      // Sync quantity from cart if applicable
      if (shouldSyncQty) {
        const inCart = cartItems.find(item =>
          item.product_id === productId && item.variant_id === variantToSelect.id
        );
        if (inCart) {
          setQuantity(inCart.quantity || 1);
        }
      }
    }
  }, [variants, cartItems, productId, preselectedVariantId, product?.images]);

  // Handler for user-driven variant selection (from VariantSelector UI)
  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant || null);
    initialSelectionDone.current = true;
    
    // Update image based on variant
    if (variant?.image_url && product?.images) {
      const variantImgIndex = product.images.indexOf(variant.image_url);
      setCurrentImage(variantImgIndex >= 0 ? variantImgIndex : -1);
    }
    
    // Sync quantity if variant is in cart, otherwise reset to 1
    const inCart = cartItems.find(item =>
      item.product_id === productId && item.variant_id === variant?.id
    );
    setQuantity(inCart ? (inCart.quantity || 1) : 1);
  };

  // Determine effective price and stock
  const effectivePrice = (hasVariants && selectedVariant)
    ? (selectedVariant.price ?? product?.price)
    : product?.price;
  const effectiveOriginalPrice = (hasVariants && selectedVariant)
    ? (selectedVariant.original_price ?? product?.original_price)
    : product?.original_price;
  const effectiveStock = (hasVariants && selectedVariant)
    ? (selectedVariant.stock ?? 0)
    : hasVariants
      ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : (product?.stock ?? 0);
  const inStock = effectiveStock > 0;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      // Final stock validation before committing
      if (effectiveStock > 0 && quantity > effectiveStock) {
        throw new Error(`Solo hay ${effectiveStock} unidades disponibles`);
      }

      const variantId = hasVariants ? selectedVariant?.id : null;
      // Normalize: treat null, undefined, and empty string as "no variant"
      const normalizeVariantId = (v) => v || null;
      const existingItem = cartItems.find(item =>
        item.product_id === productId &&
        normalizeVariantId(item.variant_id) === normalizeVariantId(variantId)
      );

      const cartData = {
        product_id: productId,
        variant_id: variantId || undefined,
        quantity,
        product_name: product.name,
        variant_name: selectedVariant?.name || undefined,
        product_image: selectedVariant?.image_url || product.images?.[0] || '',
        product_price: effectivePrice,
      };

      if (existingItem) {
        return base44.entities.CartItem.update(existingItem.id, {
          quantity: quantity
        });
      }

      return base44.entities.CartItem.create(cartData);
    },
    onSuccess: () => {
      toast.success(isAlreadyInCart ? 'Carrito actualizado' : 'Agregado al carrito');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error al agregar al carrito');
    },
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
        <p className="text-muted-foreground">Producto no encontrado</p>
      </div>
    );
  }

  // Detect if this exact product+variant combo is already in cart
  const currentVariantId = hasVariants ? selectedVariant?.id : null;
  const existingCartItem = cartItems.find(item =>
    item.product_id === productId &&
    (item.variant_id || null) === (currentVariantId || null)
  );
  const isAlreadyInCart = !!existingCartItem;

  const baseImages = product.images?.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

  // Si la variante seleccionada tiene imagen fuera del array base, ponerla primero
  const variantImgUrl = selectedVariant?.image_url;
  const variantImgInBase = variantImgUrl ? baseImages.includes(variantImgUrl) : true;
  const images = variantImgUrl && !variantImgInBase
    ? [variantImgUrl, ...baseImages]
    : baseImages;

  // Normalizar índice: si era -1 (variante fuera del array), ahora es 0
  const safeImageIndex = currentImage === -1 ? 0 : Math.min(currentImage, images.length - 1);

  const discount = effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice
    ? Math.round((1 - effectivePrice / effectiveOriginalPrice) * 100)
    : 0;

  // All attribute keys that exist across variants
  const allAttrKeys = hasVariants
    ? [...new Set(variants.flatMap(v => Array.isArray(v.attributes) ? v.attributes.map(a => a.key) : []))]
    : [];
  // User must select a value for every attribute key before adding to cart
  const needsVariantSelection = hasVariants && (
    !selectedVariant ||
    allAttrKeys.some(key => !selectedAttrMap[key])
  );

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={images[safeImageIndex]} alt={product.name} className="w-full max-h-[85vh] object-contain rounded-2xl" />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg flex items-center justify-between px-4 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex gap-2">
          {!isGuest && (
            <button
              onClick={() => toggleWishlistMutation.mutate()}
              disabled={toggleWishlistMutation.isPending}
              className="p-2 bg-secondary rounded-full disabled:opacity-50"
            >
              <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-sale text-sale' : 'text-foreground'}`} />
            </button>
          )}
          <button onClick={() => navigate(createPageUrl('Cart'))} className="p-2 bg-secondary rounded-full relative">
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
            key={safeImageIndex}
            src={images[safeImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrentImage(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === safeImageIndex ? 'bg-primary w-5' : 'bg-primary-foreground/50'}`}
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
            <button key={i} onClick={() => setCurrentImage(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === safeImageIndex ? 'border-primary' : 'border-transparent'}`}
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
            <span className="text-2xl font-extrabold text-primary">${effectivePrice?.toFixed(2)}</span>
            {discount > 0 && (
              <span className="text-sm text-muted-foreground line-through">${effectiveOriginalPrice?.toFixed(2)}</span>
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
            <span className="text-xs text-muted-foreground">{product.sold_count}+ vendidos</span>
          )}
          {inStock ? (
            <span className="text-xs text-success font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              {hasVariants && selectedVariant
                ? `${Array.isArray(selectedVariant.attributes) 
                    ? selectedVariant.attributes.map(a => `${a.key}: ${a.values.join(', ')}`).join(' / ') 
                    : selectedVariant.name} — ${effectiveStock} disponibles`
                : `En stock (${effectiveStock})`}
            </span>
          ) : (
            <span className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {hasVariants && selectedVariant ? 'Esta opción no tiene stock' : 'Sin stock'}
            </span>
          )}
        </div>

        {/* In-cart badge */}
        {isAlreadyInCart && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full w-fit">
            <ShoppingCart className="w-3.5 h-3.5" />
            Ya en carrito · {existingCartItem.quantity} {existingCartItem.quantity === 1 ? 'unidad' : 'unidades'}
          </div>
        )}

        {/* Variant selector */}
        {hasVariants && (
          <VariantSelector
            variants={variants}
            selected={selectedVariant}
            onSelect={handleVariantSelect}
            onSelectionChange={setSelectedAttrMap}
          />
        )}

        {/* Share buttons */}
        <ProductShare 
          product={product}
          productUrl={productUrl}
        />

        {/* Features */}
        <div className="flex gap-4 py-3 border-t border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="w-4 h-4" /><span>Envío gratis</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" /><span>Compra protegida</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="w-4 h-4" /><span>Devoluciones</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Descripción</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-4 border-t border-border">
        <ProductReviews productId={productId} isGuest={isGuest} />
      </div>

      {/* Related products — al final */}
      {product.category_id && (
        <RelatedProducts
          categoryId={product.category_id}
          currentProductId={productId}
          currentTags={product.tags || []}
        />
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-0 bg-secondary rounded-full">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 rounded-full">
              <Minus className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-sm font-bold w-8 text-center text-foreground">{quantity}</span>
            <button
              onClick={() => {
                if (effectiveStock > 0 && quantity >= effectiveStock) {
                  toast.error('¡Alcanzaste el límite disponible!');
                } else {
                  setQuantity(q => q + 1);
                }
              }}
              className="p-2.5 rounded-full"
            >
              <Plus className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <Button
            onClick={() => isGuest ? base44.auth.redirectToLogin(window.location.href) : addToCartMutation.mutate()}
            disabled={addToCartMutation.isPending || (!isGuest && !inStock) || needsVariantSelection}
            className="flex-1 bg-primary text-primary-foreground font-bold h-12 rounded-full text-base"
          >
            {addToCartMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isAlreadyInCart ? (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Actualizar carrito
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Agregar al carrito
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}