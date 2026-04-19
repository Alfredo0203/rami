import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, ShoppingBag, AlertTriangle, Edit2, Eye, EyeOff, Search, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import SellerProductForm from '@/components/seller/SellerProductForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== 'seller') { 
        navigate(-1); 
        return; 
      }
      setUser(u);
    }).catch(() => navigate(-1));
  }, []);

  // Obtener tienda del seller (por owner_email)
  const { data: stores = [] } = useQuery({
    queryKey: ['seller-stores'],
    queryFn: () => base44.entities.Store.filter({ owner_email: user?.email }),
    enabled: !!user,
  });

  useEffect(() => {
    if (stores.length > 0) {
      setStore(stores[0]);
    }
  }, [stores]);

  // Obtener categorías
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  // Obtener productos de la tienda del seller
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['seller-products', store?.id],
    queryFn: () => store ? base44.entities.Product.filter({ store_id: store.id }) : [],
    enabled: !!store,
  });

  // Obtener pedidos que contienen productos de esta tienda
  const { data: allOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['seller-orders', store?.id],
    queryFn: () => base44.entities.Order.list('-created_date'),
    enabled: !!store,
  });

  // Filtrar órdenes de esta tienda
  const storeOrders = allOrders.filter(order => {
    return order.items?.some(item => {
      const product = products.find(p => p.id === item.product_id);
      return product?.store_id === store?.id;
    });
  });

  // Estadísticas
  const stats = {
    activeProducts: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => {
      const stock = p.stock || 0;
      return stock > 0 && stock < 5;
    }).length,
    pendingOrders: storeOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
    totalRevenue: storeOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0),
  };

  const toggleProductActive = useMutation({
    mutationFn: (product) => base44.entities.Product.update(product.id, { is_active: !product.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Producto actualizado');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Producto eliminado');
      setDeletingProductId(null);
    },
  });

  if (!user || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const storeLogo = store.logo_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200';

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <img src={storeLogo} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{store.name}</h1>
            <p className="text-xs text-muted-foreground">Mi Tienda</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-3 shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-lg font-extrabold text-foreground">{stats.activeProducts}</p>
          <p className="text-[10px] text-muted-foreground">Productos activos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-3 shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center mb-1">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-lg font-extrabold text-foreground">{stats.lowStock}</p>
          <p className="text-[10px] text-muted-foreground">Stock bajo</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-3 shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-chart-5/10 text-chart-5 flex items-center justify-center mb-1">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <p className="text-lg font-extrabold text-foreground">{stats.pendingOrders}</p>
          <p className="text-[10px] text-muted-foreground">Pendientes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-3 shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center mb-1">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-lg font-extrabold text-foreground">${stats.totalRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Ingresos entregados</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col h-[calc(100vh-300px)]">
        <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sticky top-0 z-40 bg-background overflow-x-auto">
            <TabsList className="w-full justify-start bg-transparent">
              <TabsTrigger value="products" className="text-xs">Productos</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Pedidos</TabsTrigger>
              <TabsTrigger value="store" className="text-xs">Tienda</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4">
              {/* Productos Tab */}
              <TabsContent value="products" className="space-y-3 mt-3">
                <Button
                  onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                  className="w-full bg-primary text-primary-foreground rounded-full h-10"
                >
                  <Plus className="w-4 h-4 mr-2" /> Agregar Producto
                </Button>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {loadingProducts ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  (() => {
                    const filtered = products.filter(p =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return (
                      <div className="space-y-3">
                        {filtered.map(product => (
                          <div key={product.id} className="bg-card rounded-xl p-3 shadow-sm space-y-2">
                            <div className="flex gap-1 mb-2">
                              <button
                                onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                                className="p-1.5 bg-secondary rounded hover:bg-muted"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-foreground" />
                              </button>
                              <button
                                onClick={() => setDeletingProductId(product.id)}
                                className="p-1.5 bg-secondary rounded hover:bg-destructive/10"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                            <div className="flex gap-3">
                              <img
                                src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                                <p className="text-base font-bold text-primary">${product.price?.toFixed(2)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] ${(product.stock || 0) === 0 ? 'text-destructive font-semibold' : (product.stock || 0) < 5 ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
                                    Stock: {product.stock || 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                  <button
                                    onClick={() => toggleProductActive.mutate(product)}
                                    className="p-1.5 bg-secondary rounded hover:bg-muted"
                                    title={product.is_active ? 'Desactivar' : 'Activar'}
                                  >
                                    {product.is_active ? (
                                      <Eye className="w-3.5 h-3.5 text-success" />
                                    ) : (
                                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </TabsContent>

              {/* Pedidos Tab */}
              <TabsContent value="orders" className="space-y-3 mt-3">
                {loadingOrders ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : storeOrders.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">No hay pedidos aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {storeOrders.map(order => (
                      <div key={order.id} className="bg-card rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-foreground text-sm">Pedido #{order.order_number || order.id.slice(0, 8)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            order.status === 'delivered' ? 'bg-success/10 text-success' :
                            order.status === 'shipped' ? 'bg-primary/10 text-primary' :
                            order.status === 'processing' ? 'bg-chart-5/10 text-chart-5' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Total: ${order.total?.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Items: {order.items?.length || 0}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tienda Tab */}
              <TabsContent value="store" className="space-y-3 mt-3">
                <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Nombre</p>
                    <p className="text-sm font-medium text-foreground">{store.name}</p>
                  </div>
                  {store.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Descripción</p>
                      <p className="text-sm text-foreground">{store.description}</p>
                    </div>
                  )}
                  {store.phone && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Teléfono</p>
                      <p className="text-sm text-foreground">{store.phone}</p>
                    </div>
                  )}
                  <Button
                    onClick={() => navigate('/Admin')}
                    className="w-full bg-secondary text-foreground rounded-full h-9 text-xs mt-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar Información
                  </Button>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {showProductForm && (
        <SellerProductForm
          product={editingProduct}
          storeId={store?.id}
          categories={categories}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      )}

      <AlertDialog open={!!deletingProductId} onOpenChange={(open) => { if (!open) setDeletingProductId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteProductMutation.mutate(deletingProductId); setDeletingProductId(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}