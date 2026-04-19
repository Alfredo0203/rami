import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Star, ShoppingBag } from 'lucide-react';

export default function RelatedProducts({ categoryId, currentProductId, currentTags = [] }) {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const categoryName = data?.categories?.find(c => c.id === categoryId)?.name;

  // Misma categoría, excluye el producto actual
  const sameCategory = (data?.products || []).filter(
    p => p.category_id === categoryId && p.id !== currentProductId && p.is_active !== false
  );

  // Si hay tags, priorizar los que comparten al menos uno
  const withSharedTags = currentTags.length > 0
    ? sameCategory.filter(p => (p.tags || []).some(t => currentTags.includes(t)))
    : [];

  // Mostrar primero los de tag compartido, luego el resto, máximo 10
  const related = withSharedTags.length >= 2
    ? [...withSharedTags, ...sameCategory.filter(p => !withSharedTags.includes(p))].slice(0, 10)
    : sameCategory.slice(0, 10);

  if (!related.length) return null;

  return (
    <div className="mt-2 bg-secondary/40 py-5">
      {/* Header */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold text-primary mb-0.5">
            {categoryName ? `Más de ${categoryName}` : 'Categoría'}
          </p>
          <h3 className="text-base font-extrabold text-foreground">También te puede gustar</h3>
        </div>
        <ShoppingBag className="w-5 h-5 text-primary opacity-60" />
      </div>

      {/* Horizontal scroll */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ paddingLeft: 16, paddingRight: 16, WebkitOverflowScrolling: 'touch' }}
      >
        {related.map(product => {
          const discount = product.original_price && product.original_price > product.price
            ? Math.round((1 - product.price / product.original_price) * 100)
            : 0;
          const image = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
          const isNew = !product.sold_count || product.sold_count === 0;

          return (
            <button
              key={product.id}
              onClick={() => navigate(createPageUrl('ProductDetail') + `?id=${product.id}`)}
              className="flex-none w-40 bg-card rounded-2xl overflow-hidden shadow-md border border-border active:scale-95 transition-transform text-left"
            >
              <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                <img src={image} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discount > 0 && (
                    <span className="bg-sale text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                      -{discount}%
                    </span>
                  )}
                  {isNew && (
                    <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      NUEVO
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 mb-1.5">
                  {product.name}
                </p>

                {product.rating > 0 && (
                  <div className="flex items-center gap-1 mb-1.5">
                    {[1,2,3,4,5].map(s => (
                      <Star
                        key={s}
                        className={`w-2.5 h-2.5 ${s <= Math.round(product.rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                    <span className="text-[9px] text-muted-foreground ml-0.5">({product.review_count || 0})</span>
                  </div>
                )}

                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-primary">${product.price?.toFixed(2)}</span>
                  {discount > 0 && (
                    <span className="text-[10px] text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
                  )}
                </div>

                {product.sold_count > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{product.sold_count}+ vendidos</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}