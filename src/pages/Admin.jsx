import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AdminProductForm from '../components/admin/AdminProductForm';
import AdminOrderCard from '../components/admin/AdminOrderCard';
import AdminUserCard from '../components/admin/AdminUserCard';
import { ArrowLeft, Plus, Package, ShoppingBag, DollarSign, TrendingUp, Edit2, Trash2, Loader2, Eye, EyeOff, Users, Settings, MessageSquare, LayoutGrid, BarChart3, Ticket, Search, AlertTriangle, History } from 'lucide-react';
import AdminSettingsTab from '../components/admin/AdminSettingsTab';
import AdminReviewsTab from '../components/admin/AdminReviewsTab';
import AdminCategoriesTab from '../components/admin/AdminCategoriesTab';
import AdminCouponsTab from '../components/admin/AdminCouponsTab';
import AdminStoresTab from '../components/admin/AdminStoresTab';
import AdminInventoryModal from '../components/admin/AdminInventoryModal';
import InventoryHistoryModal from '../components/admin/InventoryHistoryModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [inventoryProduct, setInventoryProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out', 'in_stock'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'sold'

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || (u.role !== 'admin' && u.role !== 'super_admin')) { navigate(-1); return; }
      setUser(u);
    }).catch(() => navigate(-1));
  }, []);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date'),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  // Para calcular stock real de productos con variantes
  const { data: allVariants = [] } = useQuery({
    queryKey: ['admin-all-variants'],
    queryFn: () => base44.entities.ProductVariant.list(),
    enabled: products.length > 0,
  });

  const getProductStock = (product) => {
    if (product.has_variants) {
      return allVariants
        .filter(v => v.product_id === product.id && v.is_active !== false)
        .reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    return product.stock || 0;
  };

  const getProductSold = (product) => {
    if (product.has_variants) {
      // sold_count no está en variantes, usamos el de la orden
      return orders
        .filter(o => o.status !== 'cancelled')
        .flatMap(o => o.items || [])
        .filter(i => i.product_id === product.id)
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }
    return product.sold_count || 0;
  };

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!user,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto eliminado');
    },
  });

  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);
  const activeProducts = products.filter(p => p.is_active).length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const stats = [
    { label: 'Ingresos', value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'bg-success/10 text-success' },
    { label: 'Productos', value: activeProducts, icon: Package, color: 'bg-primary/10 text-primary' },
    { label: 'Pedidos', value: orders.length, icon: ShoppingBag, color: 'bg-chart-5/10 text-chart-5' },
    { label: 'Pendientes', value: pendingOrders, icon: TrendingUp, color: 'bg-warning/10 text-warning' },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Panel de Administración</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-3 shadow-sm"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mb-3 flex gap-2">
        <Button
          onClick={() => navigate('/AdminSalesCharts')}
          className="flex-1 bg-chart-1 text-primary-foreground rounded-lg h-9 hover:bg-chart-1/90 text-xs"
        >
          <BarChart3 className="w-3.5 h-3.5 mr-1" /> Ventas
        </Button>
        <Button
          onClick={() => navigate('/InventoryDashboard')}
          className="flex-1 bg-chart-4 text-primary-foreground rounded-lg h-9 hover:bg-chart-4/90 text-xs"
        >
          <Package className="w-3.5 h-3.5 mr-1" /> Inventario
        </Button>
      </div>

      <div className="flex flex-col h-[calc(100vh-310px)]">
        <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sticky top-0 z-40 bg-background overflow-x-auto">
            <TabsList className="w-full justify-start bg-transparent">
              <TabsTrigger value="products" className="text-xs">Productos</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Pedidos</TabsTrigger>
              <TabsTrigger value="users" className="text-xs">Usuarios</TabsTrigger>
              <TabsTrigger value="categories" className="px-2"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="stores" className="px-2"><Store className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="coupons" className="px-2"><Ticket className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="reviews" className="px-2"><MessageSquare className="w-4 h-4" /></TabsTrigger>
              {user?.role === 'super_admin' && (
                <TabsTrigger value="settings" className="px-2"><Settings className="w-4 h-4" /></TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4">
              <TabsContent value="products" className="space-y-3 mt-3">
          <Button
            onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
            className="w-full bg-primary text-primary-foreground rounded-full h-10"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Producto
          </Button>

          {/* Filtros */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Todo el stock</option>
                <option value="low">⚠️ Casi agotado (&lt;5)</option>
                <option value="out">❌ Agotado</option>
                <option value="in_stock">✅ En stock</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="name">Nombre</option>
                <option value="stock">Stock</option>
                <option value="sold">Más vendidos</option>
              </select>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            (() => {
              let filtered = products.filter(p => {
                const stock = getProductStock(p);
                const sold = getProductSold(p);
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStock = stockFilter === 'all' ||
                  (stockFilter === 'low' && stock > 0 && stock < 5) ||
                  (stockFilter === 'out' && stock === 0) ||
                  (stockFilter === 'in_stock' && stock >= 5);
                return matchesSearch && matchesStock;
              });

              if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
              if (sortBy === 'stock') filtered.sort((a, b) => getProductStock(a) - getProductStock(b));
              if (sortBy === 'sold') filtered.sort((a, b) => getProductSold(b) - getProductSold(a));

              return (
                <div className="space-y-3">
                  {filtered.map(product => (
                  <div key={product.id} className="bg-card rounded-xl p-3 shadow-sm space-y-2">
                  <div className="flex gap-1">
                  <button
                   onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                   className="p-1.5 bg-secondary rounded hover:bg-muted"
                   title="Editar"
                  >
                   <Edit2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                   onClick={() => setInventoryProduct(product)}
                   className="p-1.5 bg-secondary rounded hover:bg-primary/10"
                   title="Inventario"
                  >
                   <Package className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button
                   onClick={() => setHistoryProduct(product)}
                   className="p-1.5 bg-secondary rounded hover:bg-chart-4/10"
                   title="Histórico"
                  >
                   <TrendingUp className="w-3.5 h-3.5 text-chart-4" />
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
                     <span className={`text-[10px] ${getProductStock(product) === 0 ? 'text-destructive font-semibold' : getProductStock(product) < 5 ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
                       Stock: {getProductStock(product)}
                     </span>
                     <span className="text-[10px] text-muted-foreground">Vendidos: {getProductSold(product)}</span>
                   </div>
                   <div className="flex items-center gap-1 mt-1">
                     {getProductStock(product) === 0 && (
                       <AlertTriangle className="w-3 h-3 text-destructive" />
                     )}
                     {getProductStock(product) > 0 && getProductStock(product) < 5 && (
                       <AlertTriangle className="w-3 h-3 text-warning" />
                     )}
                     {product.is_active ? (
                       <Eye className="w-3 h-3 text-success" />
                     ) : (
                       <EyeOff className="w-3 h-3 text-muted-foreground" />
                     )}
                     {product.has_variants && <span className="text-[10px] text-primary/70">variantes</span>}
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

        <TabsContent value="orders" className="space-y-3 mt-3">
          {loadingOrders ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Aún no hay pedidos</p>
            </div>
          ) : (
            orders.map(order => <AdminOrderCard key={order.id} order={order} />)
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-3">
          {loadingUsers ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No se encontraron usuarios</p>
            </div>
          ) : (
            allUsers.map(u => (
              <AdminUserCard key={u.id} targetUser={u} currentUser={user} orders={orders} />
            ))
          )}
        </TabsContent>

        <TabsContent value="categories">
          <AdminCategoriesTab />
        </TabsContent>

        <TabsContent value="stores">
          <AdminStoresTab />
        </TabsContent>

        <TabsContent value="coupons">
          <AdminCouponsTab />
        </TabsContent>

        <TabsContent value="reviews">
          <AdminReviewsTab />
        </TabsContent>

        {user?.role === 'super_admin' && (
          <TabsContent value="settings">
            <AdminSettingsTab currentUser={user} />
          </TabsContent>
        )}
        </div>
        </div>
        </Tabs>
        </div>

      {showProductForm && (
        <AdminProductForm
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      )}

      {inventoryProduct && (
        <AdminInventoryModal
          product={inventoryProduct}
          open={!!inventoryProduct}
          onOpenChange={(open) => { if (!open) setInventoryProduct(null); }}
        />
      )}

      {historyProduct && (
        <InventoryHistoryModal
          product={historyProduct}
          open={!!historyProduct}
          onOpenChange={(open) => { if (!open) setHistoryProduct(null); }}
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