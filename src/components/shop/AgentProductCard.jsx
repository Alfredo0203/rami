import React from 'react';
import { ExternalLink, ShoppingBag, Star } from 'lucide-react';

/**
 * Tarjeta de producto que devuelve el asistente de compras RAmi
 * (bloque ```products de la respuesta del agente).
 */
export default function AgentProductCard({ product, onNavigate }) {
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discount = hasDiscount
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;
  const rating = Number(product.rating) || 0;
  const reviewCount = Number(product.review_count) || 0;
  const soldCount = Number(product.sold_count) || 0;

  return (
    <button
      onClick={() => onNavigate(product.id)}
      className="flex gap-3 bg-background border border-border rounded-xl p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left w-full"
    >
      <div className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
        {product.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.reason}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-primary">
            ${Number(product.price || 0).toFixed(2)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                ${Number(product.original_price).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                -{discount}%
              </span>
            </>
          )}
        </div>
        {(rating > 0 || soldCount > 0) && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            {rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-current text-warning" />
                {rating.toFixed(1)}
                {reviewCount > 0 && <span className="opacity-70">({reviewCount})</span>}
              </span>
            )}
            {soldCount > 0 && <span>{soldCount} vendidos</span>}
          </div>
        )}
      </div>

      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}