import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AdminProductForm from '../components/admin/AdminProductForm.jsx';
import AdminOrderCard from '../components/admin/AdminOrderCard';
import AdminUserCard from '../components/admin/AdminUserCard';
import { ArrowLeft, Plus, Package, ShoppingBag, DollarSign, TrendingUp, Edit2, Trash2, Loader2, Eye, EyeOff, Users, Settings } from 'lucide-react';
import AdminSettingsTab from '../components/admin/AdminSettingsTab';
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

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!user,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
  });

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total || 0), 0);
  const activeProducts = products.filter(p => p.is_active).length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const stats = [
    { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'bg-success/10 text-success' },
    { label: 'Products', value: activeProducts, icon: Package, color: 'bg-primary/10 text-primary' },
    { label: 'Orders', value: orders.length, icon: ShoppingBag, color: 'bg-chart-5/10 text-chart-5' },
    { label: 'Pending', value: pendingOrders, icon: TrendingUp, color: 'bg-warning/10 text-warning' },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
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

      <Tabs defaultValue="products" className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1">Orders</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1"><Settings className="w-3.5 h-3.5" /></TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3 mt-3">
          <Button
            onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
            className="w-full bg-primary text-primary-foreground rounded-full h-10"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>

          {loadingProducts ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            products.map(product => (
              <div key={product.id} className="bg-card rounded-xl p-3 shadow-sm flex gap-3">
                <img
                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-base font-bold text-primary">${product.price?.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {product.is_active ? (
                        <Eye className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">Stock: {product.stock || 0}</span>
                    <span className="text-[10px] text-muted-foreground">Sold: {product.sold_count || 0}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                    className="p-2 bg-secondary rounded-lg hover:bg-muted"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setDeletingProductId(product.id)}
                    className="p-2 bg-secondary rounded-lg hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-3 mt-3">
          {loadingOrders ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No orders yet</p>
            </div>
          ) : (
            orders.map(order => <AdminOrderCard key={order.id} order={order} />)
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-3 pb-6">
          {loadingUsers ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No users found</p>
            </div>
          ) : (
            allUsers.map(u => (
              <AdminUserCard key={u.id} targetUser={u} currentUser={user} orders={orders} />
            ))
          )}
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettingsTab currentUser={user} />
        </TabsContent>
      </Tabs>

      {showProductForm && (
        <AdminProductForm
          product={editingProduct}
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