import React, { useState, useMemo } from 'react';
import { X, Package, ShoppingBag, DollarSign, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StoreModal({ store, products, categories, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filtrar productos de esta tienda
  const storeProducts = useMemo(() => {
    if (!store) return [];
    let filtered = products.filter(p => {
      // Si el producto no tiene store_id, es de la tienda principal (owner)
      if (!p.store_id) {
        return store.store_type === 'owner';
      }
      return p.store_id === store.id;
    });

    // Filtrar por categoría si está seleccionada
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    return filtered.filter(p => p.is_active !== false);
  }, [products, store, selectedCategory]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalProducts = storeProducts.length;
    const totalSold = storeProducts.reduce((sum, p) => sum + (p.sold_count || 0), 0);
    const totalRevenue = storeProducts.reduce((sum, p) => sum + ((p.sold_count || 0) * (p.price || 0)), 0);
    
    return { totalProducts, totalSold, totalRevenue };
  }, [storeProducts]);

  // Obtener categorías con productos en esta tienda
  const storeCategories = useMemo(() => {
    if (!store || !categories) return [];
    const categoryIds = [...new Set(storeProducts.map(p => p.category_id))];
    return categories.filter(c => categoryIds.includes(c.id));
  }, [storeProducts, categories, store]);

  if (!store) return null;

  const storeLogo = store.logo_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background"
      >
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={storeLogo}
              alt={store.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">{store.name}</h1>
              {store.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{store.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-secondary rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Store Info Cards */}
        <div className="grid grid-cols-3 gap-2 px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl p-3 shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Package className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-foreground">{stats.totalProducts}</p>
            <p className="text-[10px] text-muted-foreground">Productos</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl p-3 shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-chart-5/10 text-chart-5 flex items-center justify-center mb-1">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-foreground">{stats.totalSold}</p>
            <p className="text-[10px] text-muted-foreground">Vendidos</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl p-3 shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-foreground">${stats.totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Ventas</p>
          </motion.div>
        </div>

        {/* Contact Info */}
        {(store.phone || store.owner_email) && (
          <div className="px-4 mb-4 space-y-2">
            {store.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{store.phone}</span>
              </div>
            )}
            {store.owner_email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>{store.owner_email}</span>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {storeCategories.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 hide-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-muted'
                }`}
              >
                Todos
              </button>
              {storeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="px-4 pb-20">
          {storeProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {storeProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}