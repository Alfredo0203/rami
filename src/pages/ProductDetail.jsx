import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShoppingCart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import VariantSelector from '@/components/product/VariantSelector';
import ProductAttributes from '@/components/product/ProductAttributes';

export default function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const productId = new URLSearchParams(location.search).get('id');

  const [selectedOptions, setSelectedOptions] = useState({});
  const [qty, setQty] = useState(1);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => base44.integrations.Core.InvokeLLM
      ? base44.entities.Product.filter({ id: productId }).then(r => r[0])
      : null,
    enabled: !!productId,
  });

  // Better: fetch directly
  const { data: prod } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: async () => {
      const results = await base44.entities.Product.filter({ id: productId });
      return results[0] || null;
    },
    enabled: !!productId,
  });

  const theProduct = prod;

  const { data: variants = [] } = useQuery({
    queryKey: ['variants', productId],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: productId }),
    enabled: !!productId && !!theProduct?.has_variants,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const addToCartMutation = useMutation({
    mutationFn: (item) => base44.entities.CartItem.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Agregado al carrito');
    },
  });

  const handleSelect = (optionName, value) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
  };

  // Compute matching variant
  const matchedVariant = useMemo(() => {
    if (!theProduct?.has_variants || !variants.length) return null;
    return variants.find(v =>
      Object.entries(selectedOptions).every(([k, val]) => v.combination?.[k] === val)
    ) || null;
  }, [selectedOptions, variants, theProduct]);

  // Dynamic images: switch by selected color
  const displayImages = useMemo(() => {
    if (!theProduct) return [];
    const colorOption = theProduct.variant_options?.find(o => o.name.toLowerCase().includes('color'));
    const selectedColor = colorOption ? selectedOptions[colorOption.name] : null;
    if (selectedColor && theProduct.color_images?.[selectedColor]?.length) {
      return theProduct.color_images[selectedColor];
    }
    if (matchedVariant?.images?.length) return matchedVariant.images;
    return theProduct.images || [];
  }, [theProduct, selectedOptions, matchedVariant]);

  const displayPrice = matchedVariant?.price ?? theProduct?.price ?? 0;
  const discount = theProduct?.original_price > theProduct?.price
    ? Math.round((1 - theProduct.price / theProduct.original_price) * 100)
    : 0;

  const allOptionsSelected = theProduct?.has_variants
    ? (theProduct.variant_options || []).every(o => !!selectedOptions[o.name])
    : true;

  const currentStock = theProduct?.has_variants
    ? (matchedVariant?.stock ?? null)
    : (theProduct?.stock ?? 0);

  const isOutOfStock = currentStock !== null && currentStock <= 0;

  const handleAddToCart = () => {
    if (theProduct?.has_variants && !allOptionsSelected) {
      toast.error('Por favor selecciona todas las opciones');
      return;
    }
    if (isOutOfStock) {
      toast.error('Producto sin stock');
      return;
    }
    addToCartMutation.mutate({
      product_id: theProduct.id,
      variant_id: matchedVariant?.id || null,
      quantity: qty,
      product_name: theProduct.name,
      product_image: displayImages[0] || '',
      product_price: displayPrice,
      selected_options: theProduct.has_variants ? selectedOptions : {},
    });
  };

  const cartCount = cartItems.length;

  if (!productId || (!isLoading && !theProduct)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Producto no encontrado.</p>
      </div>
    );
  }

  if (!theProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button onClick={() => navigate('/Cart')} className="relative p-2 bg-secondary rounded-full">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Gallery */}
      <ProductImageGallery images={displayImages} discount={discount} />

      {/* Content */}
      <div className="px-4 pt-4 space-y-5">
        {/* Title & price */}
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{theProduct.name}</h1>
          {theProduct.brand && <p className="text-sm text-muted-foreground mt-0.5">{theProduct.brand}</p>}
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-2xl font-bold text-primary">${displayPrice.toFixed(2)}</span>
            {theProduct.original_price > theProduct.price && (
              <span className="text-sm text-muted-foreground line-through">${theProduct.original_price.toFixed(2)}</span>
            )}
          </div>
          {currentStock !== null && currentStock <= 5 && currentStock > 0 && (
            <p className="text-xs text-warning font-medium mt-1">¡Solo quedan {currentStock} en stock!</p>
          )}
          {isOutOfStock && allOptionsSelected && (
            <p className="text-xs text-destructive font-medium mt-1">Sin stock</p>
          )}
        </div>

        {/* Variants */}
        {theProduct.has_variants && variants.length > 0 && (
          <VariantSelector
            variantOptions={theProduct.variant_options || []}
            selectedOptions={selectedOptions}
            variants={variants}
            onSelect={handleSelect}
            colorImages={theProduct.color_images || {}}
          />
        )}

        {/* Description */}
        {theProduct.description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Descripción</h3>
            <div className={`text-sm text-muted-foreground leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
              {theProduct.full_description || theProduct.description}
            </div>
            {(theProduct.full_description || theProduct.description)?.length > 120 && (
              <button
                onClick={() => setShowFullDesc(v => !v)}
                className="flex items-center gap-1 text-xs text-primary mt-1 font-medium"
              >
                {showFullDesc ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver más</>}
              </button>
            )}
          </div>
        )}

        {/* Attributes */}
        <ProductAttributes attributes={theProduct.attributes || {}} brand={theProduct.brand} />
      </div>

      {/* Bottom add to cart bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom z-30">
        <div className="flex items-center gap-3">
          {/* Quantity */}
          <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-6 h-6 flex items-center justify-center text-lg font-bold text-foreground">−</button>
            <span className="text-sm font-semibold w-5 text-center text-foreground">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-6 h-6 flex items-center justify-center text-lg font-bold text-foreground">+</button>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending || isOutOfStock}
            className="flex-1 bg-primary text-primary-foreground rounded-full h-11 font-bold text-base"
          >
            {isOutOfStock ? 'Sin stock' : `Agregar · $${(displayPrice * qty).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}