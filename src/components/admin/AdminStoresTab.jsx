import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Plus, Edit2, Trash2, Upload, X, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AdminShippingSettings from './AdminShippingSettings';

export default function AdminStoresTab() {
  const queryClient = useQueryClient();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [deletingStoreId, setDeletingStoreId] = useState(null);
  const [storePreviewUrl, setStorePreviewUrl] = useState(null);
  const [assigningStore, setAssigningStore] = useState(null); // store para asignar seller
  const [selectedSellerEmail, setSelectedSellerEmail] = useState('');

  // Back button closes lightbox without closing the form behind it
  useBackButtonClose(!!storePreviewUrl, () => setStorePreviewUrl(null));
  const [storeForm, setStoreForm] = useState({
    name: '',
    owner_email: '',
    logo_url: '',
    description: '',
    phone: '',
    is_active: true,
    store_type: 'external',
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-stores'],
    queryFn: () => base44.entities.User.list(),
  });

  const saveStoreMutation = useMutation({
    mutationFn: (data) => {
      if (editingStore) {
        return base44.entities.Store.update(editingStore.id, data);
      }
      return base44.entities.Store.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success(editingStore ? 'Tienda actualizada' : 'Tienda creada');
      handleStoreClose();
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Store.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Tienda eliminada');
      setDeletingStoreId(null);
    },
  });

  // Buscar el seller actual de una tienda
  const getSellerForStore = (store) => users.find(u => u.email === store.owner_email && u.role === 'seller');

  const assignSellerMutation = useMutation({
    mutationFn: async ({ store, userEmail }) => {
      const user = users.find(u => u.email === userEmail);
      if (!user) throw new Error('Usuario no encontrado');
      // Cambiar rol a seller
      await base44.entities.User.update(user.id, { role: 'seller' });
      // Actualizar owner_email de la tienda
      await base44.entities.Store.update(store.id, { owner_email: userEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stores'] });
      toast.success('Vendedor asignado correctamente');
      setAssigningStore(null);
      setSelectedSellerEmail('');
    },
  });

  const removeSellerMutation = useMutation({
    mutationFn: async ({ store }) => {
      const seller = getSellerForStore(store);
      if (seller) {
        await base44.entities.User.update(seller.id, { role: 'user' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-stores'] });
      toast.success('Vendedor desvinculado');
    },
  });

  const handleStoreOpen = (store = null) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
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
      setStoreForm({
        name: '',
        owner_email: '',
        logo_url: '',
        description: '',
        phone: '',
        is_active: true,
        store_type: 'external',
      });
    }
    setShowStoreForm(true);
  };

  const handleStoreClose = () => {
    setShowStoreForm(false);
    setEditingStore(null);
    setStorePreviewUrl(null);
  };

  const handleStoreSubmit = () => {
    if (!storeForm.name || !storeForm.owner_email) {
      toast.error('Nombre y email del dueño son requeridos');
      return;
    }
    saveStoreMutation.mutate(storeForm);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStoreForm(prev => ({ ...prev, logo_url: file_url }));
  };

  return (
    <div className="space-y-3 mt-3 pb-6">
      <AdminShippingSettings />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Gestión de Tiendas</p>
        </div>
        <Button
          onClick={() => handleStoreOpen()}
          size="sm"
          className="h-8 rounded-full"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
        </Button>
      </div>

      {/* Stores List */}
      {stores.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay tiendas registradas</p>
      ) : (
        <div className="space-y-2">
          {stores.map(store => (
            <div key={store.id} className="flex items-center gap-3 p-2 bg-card rounded-lg border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="https://drive.google.com/thumbnail?id=1XvzxcscLVC00UVnvggpG1qTLTiyQ_6d0&sz=w100" alt={store.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground truncate">{store.name}</h4>
                  {store.store_type === 'owner' && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Propietario</span>
                  )}
                  {!store.is_active && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inactiva</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{store.owner_email}</p>
                {(() => { const seller = getSellerForStore(store); return seller ? (
                  <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">
                    Vendedor: {seller.full_name || seller.email}
                  </span>
                ) : null; })()}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setAssigningStore(store); setSelectedSellerEmail(''); }}
                  className="p-1.5 bg-secondary rounded hover:bg-primary/10"
                  title="Asignar vendedor"
                >
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                </button>
                <button onClick={() => handleStoreOpen(store)} className="p-1.5 bg-secondary rounded hover:bg-muted">
                  <Edit2 className="w-3.5 h-3.5 text-foreground" />
                </button>
                {store.store_type !== 'owner' && (
                  <button onClick={() => setDeletingStoreId(store.id)} className="p-1.5 bg-secondary rounded hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store Form Modal */}
      {showStoreForm && (
        <Dialog open={showStoreForm} onOpenChange={handleStoreClose}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStore ? 'Editar Tienda' : 'Nueva Tienda'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre de la tienda</Label>
                <Input
                  value={storeForm.name}
                  onChange={e => setStoreForm({...storeForm, name: e.target.value})}
                  placeholder="Ej: Tienda Oficial"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Email del dueño</Label>
                <Select
                  value={storeForm.owner_email}
                  onValueChange={v => setStoreForm({...storeForm, owner_email: v})}
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
                    {storeForm.logo_url ? (
                      <img
                        src={storeForm.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setStorePreviewUrl(storeForm.logo_url)}
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary">{storeForm.name ? storeForm.name.charAt(0).toUpperCase() : '?'}</span>
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
                  value={storeForm.description}
                  onChange={e => setStoreForm({...storeForm, description: e.target.value})}
                  placeholder="Descripción de la tienda"
                  className="text-sm h-20"
                />
              </div>

              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={storeForm.phone}
                  onChange={e => setStoreForm({...storeForm, phone: e.target.value})}
                  placeholder="+503 1234 5678"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={storeForm.is_active}
                  onCheckedChange={v => setStoreForm({...storeForm, is_active: v})}
                />
                <Label className="text-xs">Tienda activa</Label>
              </div>

              {!editingStore && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={storeForm.store_type === 'owner'}
                    onCheckedChange={v => setStoreForm({...storeForm, store_type: v ? 'owner' : 'external'})}
                  />
                  <Label className="text-xs">Tienda principal (no eliminable)</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleStoreClose}>Cancelar</Button>
              <Button
                onClick={handleStoreSubmit}
                disabled={saveStoreMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {saveStoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingStore ? 'Actualizar' : 'Crear')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Invisible blocker that sits above the Dialog but below the lightbox */}
      {storePreviewUrl && createPortal(
        <div className="fixed inset-0 z-[9998]" />,
        document.body
      )}

      {/* Store Preview Modal — rendered via portal to escape Dialog's focus trap */}
      {storePreviewUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setStorePreviewUrl(null)}
          onTouchMove={e => e.preventDefault()}
          style={{ touchAction: 'none', isolation: 'isolate' }}
          onKeyDown={e => { if (e.key === 'Escape') setStorePreviewUrl(null); }}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={storePreviewUrl} alt="Vista previa" className="w-full rounded-2xl" />
            <button
              onClick={() => setStorePreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Seller Modal */}
      {assigningStore && (
        <Dialog open={!!assigningStore} onOpenChange={() => { setAssigningStore(null); setSelectedSellerEmail(''); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Asignar Vendedor — {assigningStore.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(() => {
                const currentSeller = getSellerForStore(assigningStore);
                return currentSeller ? (
                  <div className="flex items-center justify-between bg-accent/10 rounded-lg p-2.5">
                    <div>
                      <p className="text-xs font-medium text-foreground">{currentSeller.full_name || currentSeller.email}</p>
                      <p className="text-[10px] text-muted-foreground">{currentSeller.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-destructive text-destructive"
                      onClick={() => removeSellerMutation.mutate({ store: assigningStore })}
                      disabled={removeSellerMutation.isPending}
                    >
                      <UserMinus className="w-3 h-3 mr-1" /> Desvincular
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin vendedor asignado.</p>
                );
              })()}
              <div>
                <Label className="text-xs">Seleccionar nuevo vendedor</Label>
                <Select value={selectedSellerEmail} onValueChange={setSelectedSellerEmail}>
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="Elegir usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role !== 'super_admin' && u.role !== 'admin').map(u => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name || u.email} {u.role === 'seller' ? '(ya es vendedor)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAssigningStore(null); setSelectedSellerEmail(''); }}>Cancelar</Button>
              <Button
                onClick={() => assignSellerMutation.mutate({ store: assigningStore, userEmail: selectedSellerEmail })}
                disabled={!selectedSellerEmail || assignSellerMutation.isPending}
              >
                {assignSellerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Asignar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Store Delete Confirmation */}
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
              onClick={() => deleteStoreMutation.mutate(deletingStoreId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}