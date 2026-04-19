import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Loader2, Store, Upload, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StoreModal from '../shop/StoreModal';

export default function AdminStoresTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [deletingStoreId, setDeletingStoreId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [viewingStore, setViewingStore] = useState(null);

  const [form, setForm] = useState({
    name: '',
    owner_email: '',
    logo_url: '',
    description: '',
    phone: '',
    is_active: true,
    store_type: 'external',
  });

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => base44.entities.Review.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingStore) {
        return base44.entities.Store.update(editingStore.id, data);
      }
      return base44.entities.Store.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success(editingStore ? 'Tienda actualizada' : 'Tienda creada');
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Store.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Tienda eliminada');
      setDeletingStoreId(null);
    },
  });

  const handleOpen = (store = null) => {
    if (store) {
      setEditingStore(store);
      setForm({
        name: store.name || '',
        owner_email: store.owner_email || '',
        logo_url: store.logo_url || '',
        description: store.description || '',
        phone: store.phone || '',
        is_active: store.is_active !== false,
        store_type: store.store_type || 'external',
      });
    } else {
      setEditingStore(null);
      setForm({
        name: '',
        owner_email: '',
        logo_url: '',
        description: '',
        phone: '',
        is_active: true,
        store_type: 'external',
      });
    }
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingStore(null);
    setPreviewUrl(null);
  };

  const handleSubmit = () => {
    if (!form.name || !form.owner_email) {
      toast.error('Nombre y email del dueño son requeridos');
      return;
    }
    saveMutation.mutate(form);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, logo_url: file_url }));
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={() => handleOpen()}
        className="w-full bg-primary text-primary-foreground rounded-full h-10"
      >
        <Plus className="w-4 h-4 mr-2" /> Agregar Tienda
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : stores.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No hay tiendas registradas</div>
      ) : (
        <div className="space-y-3">
          {stores.map(store => (
            <div key={store.id} className="bg-card rounded-xl p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="https://drive.google.com/thumbnail?id=1XvzxcscLVC00UVnvggpG1qTLTiyQ_6d0&sz=w100" alt={store.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{store.name}</h3>
                    {store.store_type === 'owner' && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Propietario</span>
                    )}
                    {!store.is_active && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Dueño: {store.owner_email}</p>
                  {store.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{store.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setViewingStore(store)}
                      className="p-1.5 bg-secondary rounded hover:bg-primary/10"
                      title="Ver tienda"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleOpen(store)}
                      className="p-1.5 bg-secondary rounded hover:bg-muted"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-foreground" />
                    </button>
                    {store.store_type !== 'owner' && (
                      <button
                        onClick={() => setDeletingStoreId(store.id)}
                        className="p-1.5 bg-secondary rounded hover:bg-destructive/10"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={handleClose}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStore ? 'Editar Tienda' : 'Nueva Tienda'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre de la tienda</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ej: Tienda Oficial"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Email del dueño</Label>
                <Select
                  value={form.owner_email}
                  onValueChange={v => setForm({...form, owner_email: v})}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{u.email} - {u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Logo</Label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewUrl(form.logo_url)}
                      />
                    ) : (
                      <img src="https://drive.google.com/thumbnail?id=1XvzxcscLVC00UVnvggpG1qTLTiyQ_6d0&sz=w100" alt="Logo" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="w-full h-10 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Descripción de la tienda"
                  className="text-sm h-20"
                />
              </div>

              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+503 1234 5678"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm({...form, is_active: v})}
                />
                <Label className="text-xs">Tienda activa</Label>
              </div>

              {!editingStore && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.store_type === 'owner'}
                    onCheckedChange={v => setForm({...form, store_type: v ? 'owner' : 'external'})}
                  />
                  <Label className="text-xs">Tienda principal (no eliminable)</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingStore ? 'Actualizar' : 'Crear')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={previewUrl} alt="Vista previa" className="w-full rounded-2xl" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Store View Modal */}
      {viewingStore && (
        <StoreModal
          store={viewingStore}
          products={products}
          categories={categories}
          orders={orders}
          reviews={reviews}
          onClose={() => setViewingStore(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingStoreId} onOpenChange={(open) => { if (!open) setDeletingStoreId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productos de esta tienda quedarán sin asignar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deletingStoreId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}