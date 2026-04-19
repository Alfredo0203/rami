import React, { useState, useMemo } from 'react';
import { X, Package, ShoppingBag, Phone, Mail, Star, Info, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StoreModal({ store, products, categories, orders = [], reviews = [], onClose }) {
  const [activeTab, setActiveTab] = useState('products');
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
    
    // Contar solo productos de órdenes entregadas
    let totalSold = 0;
    const storeProductIds = new Set(storeProducts.map(p => p.id));
    
    orders.forEach(order => {
      if (order.status === 'delivered') {
        order.items?.forEach(item => {
          if (storeProductIds.has(item.product_id)) {
            totalSold += item.quantity || 0;
          }
        });
      }
    });
    
    return { totalProducts, totalSold };
  }, [storeProducts, orders]);

  // Obtener categorías con productos en esta tienda
  const storeCategories = useMemo(() => {
    if (!store || !categories) return [];
    const categoryIds = [...new Set(storeProducts.map(p => p.category_id))];
    return categories.filter(c => categoryIds.includes(c.id));
  }, [storeProducts, categories, store]);

  // Obtener reseñas de los productos de esta tienda
  const storeReviews = useMemo(() => {
    const storeProductIds = new Set(storeProducts.map(p => p.id));
    return (reviews || [])
      .filter(r => storeProductIds.has(r.product_id) && r.is_approved)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
  }, [storeProducts, reviews]);

  if (!store) return null;

  const storeLogo = store.logo_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Store Info Cards */}
        <div className="grid grid-cols-2 gap-2 px-4 py-4">
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
        </div>

        {/* Tabs - After stats cards */}
        <div className="sticky top-[88px] z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-2">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === 'products'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Artículos
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === 'reviews'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reseñas
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === 'about'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Acerca de
            </button>
          </div>
        </div>



        {/* Products Tab Content */}
        {activeTab === 'products' && (
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {/* Categories */}
            {storeCategories.length > 0 && (
              <div className="mb-4 pt-2">
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
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
            {storeProducts.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 mb-8">
                {storeProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab Content */}
        {activeTab === 'reviews' && (
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {storeReviews.length > 0 ? (
              <div className="space-y-3 py-4">
                {storeReviews.map(review => (
                  <div key={review.id} className="bg-card rounded-lg p-3 border border-border/50">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{review.reviewer_name}</span>
                    </div>
                    {review.title && (
                      <p className="text-xs font-medium text-foreground mb-1">{review.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{review.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No hay reseñas aún</p>
              </div>
            )}
          </div>
        )}

        {/* About Tab Content */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            <div className="py-4 space-y-4">
              {/* Description */}
              {store.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Descripción</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{store.description}</p>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Contacto</h3>
                <div className="space-y-2">
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {store.phone}
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    {store.owner_email}
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Información</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="text-foreground capitalize">{store.store_type === 'owner' ? 'Tienda principal' : 'Externa'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Productos:</span>
                    <span className="text-foreground">{stats.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas:</span>
                    <span className="text-foreground">{stats.totalSold}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}