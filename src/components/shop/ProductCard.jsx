import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function ProductCard({ product, index = 0 }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={createPageUrl('ProductDetail') + `?id=${product.id}`}
        className="block group"
      >
        <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {discount > 0 && (
              <span className="absolute top-2 left-2 bg-sale text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                -{discount}%
              </span>
            )}
            {product.is_featured && (product.effective_stock ?? product.stock ?? 0) > 0 && (
              <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                HOT
              </span>
            )}
            {(product.effective_stock ?? product.stock ?? 0) === 0 && (
              <span className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                Agotado
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs text-foreground line-clamp-2 leading-tight mb-1.5 font-medium">
              {product.name}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-primary">
                ${product.price?.toFixed(2)}
              </span>
              {discount > 0 && (
                <span className="text-[10px] text-muted-foreground line-through">
                  ${product.original_price?.toFixed(2)}
                </span>
              )}
            </div>
            {product.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="text-[10px] text-muted-foreground">
                  {product.rating?.toFixed(1)} ({product.sold_count || 0}+ sold)
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}