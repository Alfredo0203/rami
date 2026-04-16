import React, { useState } from 'react';
import { Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function CartItemCard({ item, onUpdateQty, onRemove, stockInfo }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showStockMsg, setShowStockMsg] = useState(false);

  const handlePlusClick = () => {
    if (item.quantity >= available) {
      setShowStockMsg(true);
      setTimeout(() => setShowStockMsg(false), 2500);
    } else {
      onUpdateQty(item, item.quantity + 1);
    }
  };

  // stockInfo: { available: number } — si no se pasa, no mostramos alerta
  const available = stockInfo?.available ?? Infinity;
  const isOverStock = item.quantity > available;

  const goToProduct = () => {
    const url = createPageUrl('ProductDetail') + `?id=${item.product_id}` + (item.variant_id ? `&variant_id=${item.variant_id}` : '') + `&qty=${item.quantity}`;
    navigate(url);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-card rounded-xl p-3 flex gap-3 shadow-sm"
    >
      <button onClick={goToProduct} className="flex-shrink-0 focus:outline-none">
        <img
          src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
          alt={item.product_name}
          className="w-20 h-20 rounded-lg object-cover"
        />
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={goToProduct} className="text-left w-full focus:outline-none">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{item.product_name}</p>
          {item.variant_name && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.variant_name}</p>
          )}
        </button>
        <p className="text-base font-bold text-primary mt-1">${item.product_price?.toFixed(2)}</p>
        {isOverStock && (
          <p className="flex items-center gap-1 text-[10px] text-destructive font-medium mt-1">
            <AlertTriangle className="w-3 h-3" />
            Solo {available} disponible{available !== 1 ? 's' : ''}
          </p>
        )}
        <div className="flex items-center justify-between mt-2 relative">
          <div className="flex items-center gap-0 bg-secondary rounded-full">
            <button
              onClick={() => onUpdateQty(item, item.quantity - 1)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <Minus className="w-3.5 h-3.5 text-foreground" />
            </button>
            <span className="text-sm font-semibold w-7 text-center text-foreground">{item.quantity}</span>
            <button
              onClick={handlePlusClick}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
          <AnimatePresence>
            {showStockMsg && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full pointer-events-none"
              >
                {available === 0 ? 'Sin stock disponible' : `Máx. ${available} disponible${available !== 1 ? 's' : ''}`}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setConfirmOpen(true)}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar del carrito?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{item.product_name}</strong>{item.variant_name ? ` (${item.variant_name})` : ''} de tu carrito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemove(item)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}