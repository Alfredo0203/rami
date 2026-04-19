import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Star } from 'lucide-react';

export default function RelatedProducts({ categoryId, currentProductId }) {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const related = (data?.products || [])
    .filter(p => p.category_id === categoryId && p.id !== currentProductId && p.is_active !== false)
    .slice(0, 8);

  if (!related.length) return null;

  return (
    <div className="mt-4 border-t border-border px-4 py-4">
      <h3 className="text-sm font-bold text-foreground mb-3">Productos relacionados</h3>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {related.map(product => {
          const discount = product.original_price && product.original_price > product.price
            ? Math.round((1 - product.price / product.original_price) * 100)
            : 0;
          const image = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';

          return (
            <button
              key={product.id}
              onClick={() => navigate(createPageUrl('ProductDetail') + `?id=${product.id}`)}
              className="flex-shrink-0 w-36 bg-card rounded-xl overflow-hidden shadow-sm border border-border active:scale-95 transition-transform text-left"
            >
              <div className="relative aspect-square">
                <img src={image} alt={product.name} className="w-full h-full object-cover" />
                {discount > 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-sale text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    -{discount}%
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-foreground font-medium leading-tight line-clamp-2 mb-1">{product.name}</p>
                {product.rating > 0 && (
                  <div className="flex items-center gap-0.5 mb-1">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span className="text-[10px] text-muted-foreground">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">${product.price?.toFixed(2)}</span>
                  {discount > 0 && (
                    <span className="text-[10px] text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}