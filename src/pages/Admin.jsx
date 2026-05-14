import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AdminProductForm from '../components/admin/AdminProductForm';
import AdminOrderCard from '../components/admin/AdminOrderCard';
import AdminUserCard from '../components/admin/AdminUserCard';
import { ArrowLeft, Plus, Package, ShoppingBag, DollarSign, TrendingUp, Edit2, Trash2, Loader2, Eye, EyeOff, Users, Settings, MessageSquare, LayoutGrid, BarChart3, Ticket, Search, AlertTriangle, History, Store, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AdminSettingsTab from '../components/admin/AdminSettingsTab';
import AdminReviewsTab from '../components/admin/AdminReviewsTab';
import AdminCategoriesTab from '../components/admin/AdminCategoriesTab';
import AdminCouponsTab from '../components/admin/AdminCouponsTab';
import AdminStoresTab from '../components/admin/AdminStoresTab';
import AdminCancelRequestsTab from '../components/admin/AdminCancelRequestsTab';
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
  const [stockFilters, setStockFilters] = useState([]);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'stock', 'sold'
  const [storeFilters, setStoreFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [orderStatusFilters, setOrderStatusFilters] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState('newest');
  const [showSummary, setShowSummary] = useState(false);
  const [showProductFilters, setShowProductFilters] = useState(false);
  const [showOrderFilters, setShowOrderFilters] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilters, setUserStatusFilters] = useState([]);
  const [userRoleFilters, setUserRoleFilters] = useState([]);

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

  const { data: stores = [] } = useQuery({
    queryKey: ['admin-all-stores'],
    queryFn: () => base44.entities.Store.list('-created_date'),
  });

  // Filtrar para mostrar solo tiendas externas (no la tienda principal)
  const externalStores = stores.filter(store => store.store_type !== 'owner');

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto eliminado');
    },
  });

  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);
  const activeProducts = products.filter(p => p.is_active).length;
  const inactiveProducts = products.filter(p => !p.is_active).length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const stats = [
    { label: 'Ingresos', value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'bg-success/10 text-success' },
    { label: 'Productos', value: products.length, icon: Package, color: 'bg-primary/10 text-primary', sub: `${activeProducts} activos` },
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

      {/* Stats toggle */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Estadísticas y accesos rápidos</span>
          </div>
          {showSummary ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      {showSummary && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-3 shadow-sm"
              >
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.sub && <p className="text-[10px] text-muted-foreground">{stat.sub}</p>}
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
              className="flex-1 bg-primary text-primary-foreground rounded-lg h-9 hover:bg-primary/90 text-xs"
            >
              <Package className="w-3.5 h-3.5 mr-1" /> Inventario
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col" style={{ height: showSummary ? 'calc(100vh - 310px)' : 'calc(100vh - 110px)' }}>
        <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sticky top-0 z-40 bg-background overflow-x-auto">
            <TabsList className="w-full justify-start bg-transparent">
              <TabsTrigger value="products" className="text-xs">Productos</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Pedidos</TabsTrigger>
              <TabsTrigger value="users" className="text-xs">Usuarios</TabsTrigger>
              <TabsTrigger value="categories" className="px-2"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="coupons" className="px-2"><Ticket className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="reviews" className="px-2"><MessageSquare className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="stores" className="px-2"><Store className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="cancel_requests" className="px-2 relative">
                <AlertTriangle className="w-4 h-4" />
              </TabsTrigger>
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

          {/* Filtros — Sheet igual que Browse */}
          {(() => {
            const toggleMulti = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
            const activeCount = [
              !!searchQuery,
              stockFilters.length > 0,
              sortBy !== 'recent',
              categoryFilters.length > 0,
            ].filter(Boolean).length;
            return (
              <Sheet open={showProductFilters} onOpenChange={setShowProductFilters}>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowProductFilters(true)}
                    className="relative p-1.5 bg-secondary rounded-full"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-foreground" />
                    {activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                        {activeCount}
                      </span>
                    )}
                  </button>
                  {activeCount > 0 && (
                    <button
                      onClick={() => { setSearchQuery(''); setStockFilters([]); setSortBy('recent'); setCategoryFilters([]); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                  )}
                </div>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
                  <SheetHeader className="flex flex-row items-center justify-between pr-8">
                    <SheetTitle>Filtros de productos</SheetTitle>
                    {activeCount > 0 && (
                      <button
                        onClick={() => { setSearchQuery(''); setStockFilters([]); setSortBy('recent'); setCategoryFilters([]); }}
                        className="text-xs text-primary font-medium"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </SheetHeader>
                  <div className="space-y-5 py-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Nombre del producto..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Stock <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[['in_stock','✅ En stock'],['low','⚠️ Casi agotado'],['out','❌ Agotado']].map(([v, label]) => (
                          <button key={v} onClick={() => toggleMulti(stockFilters, setStockFilters, v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${stockFilters.includes(v) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Categoría <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => toggleMulti(categoryFilters, setCategoryFilters, cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryFilters.includes(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Ordenar por</label>
                      <div className="flex flex-wrap gap-2">
                        {[['recent','Más recientes'],['name','Nombre'],['stock','Stock'],['sold','Más vendidos']].map(([v, label]) => (
                          <button key={v} onClick={() => setSortBy(v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sortBy === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => setShowProductFilters(false)} className="w-full bg-primary text-primary-foreground rounded-full">
                      Aplicar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            );
          })()}

          {loadingProducts ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            (() => {
              let filtered = products.filter(p => {
                const stock = getProductStock(p);
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStock = stockFilters.length === 0 || stockFilters.some(f =>
                  (f === 'low' && stock > 0 && stock < 5) ||
                  (f === 'out' && stock === 0) ||
                  (f === 'in_stock' && stock >= 5)
                );
                const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(p.category_id);
                return matchesSearch && matchesStock && matchesCategory;
              });

              if (sortBy === 'recent') filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
              if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
              if (sortBy === 'stock') filtered.sort((a, b) => getProductStock(a) - getProductStock(b));
              if (sortBy === 'sold') filtered.sort((a, b) => getProductSold(b) - getProductSold(a));

              return (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de <span className="font-semibold text-foreground">{products.length}</span> productos
                    {inactiveProducts > 0 && <span className="ml-1">({inactiveProducts} inactivos)</span>}
                  </p>
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
                   className="p-1.5 bg-secondary rounded hover:bg-primary/10"
                   title="Histórico"
                   >
                   <TrendingUp className="w-3.5 h-3.5 text-primary" />
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
          {/* Filtros — Sheet igual que Browse */}
          {(() => {
            const toggleMulti = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
            const activeCount = [
              !!orderSearch,
              orderStatusFilters.length > 0,
              orderSort !== 'newest',
              storeFilters.length > 0,
            ].filter(Boolean).length;
            return (
              <Sheet open={showOrderFilters} onOpenChange={setShowOrderFilters}>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowOrderFilters(true)}
                    className="relative p-1.5 bg-secondary rounded-full"
                    >
                    <SlidersHorizontal className="w-4 h-4 text-foreground" />
                    {activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                        {activeCount}
                      </span>
                    )}
                  </button>
                  {activeCount > 0 && (
                    <button
                      onClick={() => { setOrderSearch(''); setOrderStatusFilters([]); setOrderSort('newest'); setStoreFilters([]); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                  )}
                </div>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
                  <SheetHeader className="flex flex-row items-center justify-between pr-8">
                    <SheetTitle>Filtros de pedidos</SheetTitle>
                    {activeCount > 0 && (
                      <button
                        onClick={() => { setOrderSearch(''); setOrderStatusFilters([]); setOrderSort('newest'); setStoreFilters([]); }}
                        className="text-xs text-primary font-medium"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </SheetHeader>
                  <div className="space-y-5 py-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Cliente o N° pedido..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Estado <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[['pending','⏳ Pendientes'],['processing','🔄 En proceso'],['shipped','🚚 Enviados'],['delivered','✅ Entregados'],['cancelled','❌ Cancelados']].map(([v, label]) => (
                          <button key={v} onClick={() => toggleMulti(orderStatusFilters, setOrderStatusFilters, v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${orderStatusFilters.includes(v) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Tienda <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => toggleMulti(storeFilters, setStoreFilters, 'main')}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${storeFilters.includes('main') ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                          Rami (Mi tienda)
                        </button>
                        {externalStores.map(store => (
                          <button key={store.id} onClick={() => toggleMulti(storeFilters, setStoreFilters, store.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${storeFilters.includes(store.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {store.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Ordenar por</label>
                      <div className="flex flex-wrap gap-2">
                        {[['newest','Más recientes'],['oldest','Más antiguos'],['total_desc','Mayor monto'],['total_asc','Menor monto']].map(([v, label]) => (
                          <button key={v} onClick={() => setOrderSort(v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${orderSort === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => setShowOrderFilters(false)} className="w-full bg-primary text-primary-foreground rounded-full">
                      Aplicar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            );
          })()}

          {loadingOrders ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Aún no hay pedidos</p>
            </div>
          ) : (
            (() => {
              let filteredOrders = orders;

              // Filtro por tienda
              if (storeFilters.length > 0) {
                filteredOrders = filteredOrders.filter(order =>
                  order.items?.some(item => {
                    const product = products.find(p => p.id === item.product_id);
                    const storeId = product?.store_id || 'main';
                    return storeFilters.includes(storeId);
                  })
                );
              }

              // Filtro por estado
              if (orderStatusFilters.length > 0) {
                filteredOrders = filteredOrders.filter(o => orderStatusFilters.includes(o.status));
              }

              // Búsqueda por cliente o número
              if (orderSearch.trim()) {
                const q = orderSearch.toLowerCase();
                filteredOrders = filteredOrders.filter(o =>
                  o.order_number?.toLowerCase().includes(q) ||
                  o.customer_name?.toLowerCase().includes(q) ||
                  o.customer_email?.toLowerCase().includes(q)
                );
              }

              // Ordenamiento
              if (orderSort === 'newest') filteredOrders = [...filteredOrders].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
              if (orderSort === 'oldest') filteredOrders = [...filteredOrders].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
              if (orderSort === 'total_desc') filteredOrders = [...filteredOrders].sort((a, b) => b.total - a.total);
              if (orderSort === 'total_asc') filteredOrders = [...filteredOrders].sort((a, b) => a.total - b.total);

              return filteredOrders.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">No hay pedidos que coincidan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredOrders.length}</span> pedido{filteredOrders.length !== 1 ? 's' : ''}
                    {filteredOrders.length !== orders.length && ` de ${orders.length}`}
                  </p>
                  {filteredOrders.map(order => <AdminOrderCard key={order.id} order={order} />)}
                </div>
              );
            })()
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-3">
          {/* Filtros de usuarios */}
          {(() => {
            const toggleMulti = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
            const activeCount = [
              !!userSearch,
              userStatusFilters.length > 0,
              userRoleFilters.length > 0,
            ].filter(Boolean).length;
            return (
              <Sheet open={showUserFilters} onOpenChange={setShowUserFilters}>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowUserFilters(true)}
                    className="relative p-1.5 bg-secondary rounded-full"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-foreground" />
                    {activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                        {activeCount}
                      </span>
                    )}
                  </button>
                  {activeCount > 0 && (
                    <button
                      onClick={() => { setUserSearch(''); setUserStatusFilters([]); setUserRoleFilters([]); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                  )}
                </div>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
                  <SheetHeader className="flex flex-row items-center justify-between pr-8">
                    <SheetTitle>Filtros de usuarios</SheetTitle>
                    {activeCount > 0 && (
                      <button
                        onClick={() => { setUserSearch(''); setUserStatusFilters([]); setUserRoleFilters([]); }}
                        className="text-xs text-primary font-medium"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </SheetHeader>
                  <div className="space-y-5 py-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Nombre o email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Estado <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[['active','✅ Activos'],['suspended','⚠️ Suspendidos'],['deactivated','🚫 Desactivados']].map(([v, label]) => (
                          <button key={v} onClick={() => toggleMulti(userStatusFilters, setUserStatusFilters, v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${userStatusFilters.includes(v) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">Rol <span className="text-[10px] text-muted-foreground font-normal">(selección múltiple)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[['user','Clientes'],['admin','Admins'],['seller','Vendedores'],['super_admin','Propietarios']].map(([v, label]) => (
                          <button key={v} onClick={() => toggleMulti(userRoleFilters, setUserRoleFilters, v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${userRoleFilters.includes(v) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => setShowUserFilters(false)} className="w-full bg-primary text-primary-foreground rounded-full">
                      Aplicar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            );
          })()}

          {loadingUsers ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No se encontraron usuarios</p>
            </div>
          ) : (
            (() => {
              let filtered = allUsers;
              if (userStatusFilters.length > 0) filtered = filtered.filter(u => userStatusFilters.includes(u.status || 'active'));
              if (userRoleFilters.length > 0) filtered = filtered.filter(u => userRoleFilters.includes(u.role));
              if (userSearch.trim()) {
                const q = userSearch.toLowerCase();
                filtered = filtered.filter(u =>
                  u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
                );
              }
              return filtered.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">No hay usuarios que coincidan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{filtered.length}</span> usuario{filtered.length !== 1 ? 's' : ''}
                    {filtered.length !== allUsers.length && ` de ${allUsers.length}`}
                  </p>
                  {filtered.map(u => (
                    <AdminUserCard key={u.id} targetUser={u} currentUser={user} orders={orders} stores={stores} />
                  ))}
                </div>
              );
            })()
          )}
        </TabsContent>

        <TabsContent value="categories">
          <AdminCategoriesTab />
        </TabsContent>

        <TabsContent value="coupons">
          <AdminCouponsTab />
        </TabsContent>

        <TabsContent value="reviews">
          <AdminReviewsTab />
        </TabsContent>

        <TabsContent value="stores">
          <AdminStoresTab />
        </TabsContent>

        <TabsContent value="cancel_requests" className="mt-3 px-0">
          <AdminCancelRequestsTab />
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