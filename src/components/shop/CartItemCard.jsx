import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CartItemCard({ item, onUpdateQty, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-card rounded-xl p-3 flex gap-3 shadow-sm"
    >
      <img
        src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
        alt={item.product_name}
        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{item.product_name}</p>
        <p className="text-base font-bold text-primary mt-1">${item.product_price?.toFixed(2)}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-0 bg-secondary rounded-full">
            <button
              onClick={() => onUpdateQty(item, item.quantity - 1)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <Minus className="w-3.5 h-3.5 text-foreground" />
            </button>
            <span className="text-sm font-semibold w-7 text-center text-foreground">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item, item.quantity + 1)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
          <button
            onClick={() => onRemove(item)}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}