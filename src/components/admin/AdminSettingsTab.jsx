import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wrench, CreditCard, Banknote, LayoutDashboard, Megaphone, Store, Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGES_CONFIG = [
  { path: 'Browse', label: 'Browse / Catálogo', description: 'Explorar productos por categoría' },
  { path: 'ProductDetail', label: 'Detalle de Producto', description: 'Ver detalles de un producto específico' },
  { path: 'Cart', label: 'Carrito', description: 'Ver y gestionar el carrito de compras' },
  { path: 'Checkout', label: 'Checkout', description: 'Proceso de pago y confirmación' },
  { path: 'Orders', label: 'Mis Pedidos', description: 'Historial de órdenes del usuario' },
  { path: 'OrderDetail', label: 'Detalle de Orden', description: 'Ver detalles de una orden específica' },
  { path: 'OrderConfirmation', label: 'Confirmación de Orden', description: 'Pantalla de confirmación tras compra' },
  { path: 'Addresses', label: 'Mis Direcciones', description: 'Gestión de direcciones de envío' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Pago con Tarjeta', description: 'Tarjeta de crédito / débito vía pasarela de pago', icon: CreditCard },
  { value: 'cash_on_delivery', label: 'Contra Entrega', description: 'El cliente paga cuando recibe el pedido', icon: Banknote },
];

export default function AdminSettingsTab({ currentUser }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Store management state
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [deletingStoreId, setDeletingStoreId] = useState(null);
  const [storePreviewUrl, setStorePreviewUrl] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    owner_email: '',
    logo_url: '',
    description: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: 'global' })
      .then(results => setSettings(results[0] || null))
      .finally(() => setLoading(false));
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['admin-stores-settings'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-settings'],
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
      queryClient.invalidateQueries({ queryKey: ['admin-stores-settings'] });
      toast.success(editingStore ? 'Tienda actualizada' : 'Tienda creada');
      handleStoreClose();
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Store.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores-settings'] });
      toast.success('Tienda eliminada');
      setDeletingStoreId(null);
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

  const saveSettings = async (patch) => {
    setSaving(true);
    try {
      const payload = {
        key: 'global',
        ...settings,
        ...patch,
        updated_by: currentUser?.email,
        updated_at: new Date().toISOString(),
      };
      if (settings?.id) {
        const updated = await base44.entities.AppSettings.update(settings.id, payload);
        setSettings(updated);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettings(created);
      }
      toast.success('Configuración actualizada');
    } catch {
      toast.error('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const [bannerForm, setBannerForm] = useState(null);

  // Initialize bannerForm when settings load
  useEffect(() => {
    if (settings && bannerForm === null) {
      setBannerForm({
        promo_banner_label:    settings.promo_banner_label    ?? 'Flash Sale',
        promo_banner_title:    settings.promo_banner_title    ?? 'Up to 70% OFF',
        promo_banner_subtitle: settings.promo_banner_subtitle ?? 'Created by Alfred & Raquel',
        promo_banner_link:     settings.promo_banner_link     ?? '',
        promo_banner_enabled:  settings.promo_banner_enabled  ?? true,
      });
    }
  }, [settings]);

  const saveBanner = () => saveSettings(bannerForm);

  const toggleDevMode = (value) => saveSettings({ development_mode: value });

  const togglePage = (path, enabled) => {
    const current = settings?.disabled_pages || [];
    const updated = enabled
      ? current.filter(p => p !== path)
      : [...new Set([...current, path])];
    saveSettings({ disabled_pages: updated });
  };

  const togglePaymentMethod = (method, enabled) => {
    const current = settings?.allowed_payment_methods || ['credit_card'];
    const updated = enabled
      ? [...new Set([...current, method])]
      : current.filter(m => m !== method);
    // Must keep at least one
    if (updated.length === 0) {
      toast.error('Debe haber al menos un método de pago habilitado');
      return;
    }
    saveSettings({ allowed_payment_methods: updated });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const devMode = settings?.development_mode === true;
  const allowedMethods = settings?.allowed_payment_methods || ['credit_card'];

  return (
    <div className="space-y-4 mt-3 pb-6">
      {/* Store Management Section */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
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
        
        {stores.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay tiendas registradas</p>
        ) : (
          <div className="space-y-2">
            {stores.map(store => (
              <div key={store.id} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop" alt={store.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{store.name}</h4>
                    {!store.is_active && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{store.owner_email}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleStoreOpen(store)} className="p-1.5 bg-secondary rounded hover:bg-muted">
                    <Edit2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button onClick={() => setDeletingStoreId(store.id)} className="p-1.5 bg-secondary rounded hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Dev Mode */}
      <div className="bg-card rounded-xl p-4 shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Wrench className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t('admin_dev_mode')}</p>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={devMode} onCheckedChange={toggleDevMode} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('admin_dev_mode_desc')}</p>
          {devMode && (
            <p className="text-xs text-warning font-medium mt-2">
              ⚠️ El modo desarrollo está activo. Los usuarios regulares solo pueden acceder al Inicio.
            </p>
          )}
          {settings?.updated_by && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Última actualización por {settings.updated_by}
            </p>
          )}
        </div>
      </div>

      {/* Page Visibility — only shown when dev mode is ON */}
      {devMode && <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Visibilidad de Pantallas</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Habilita o deshabilita pantallas para usuarios regulares.</p>
        <div className="space-y-3">
          {PAGES_CONFIG.map(({ path, label, description }) => {
            const disabledPages = settings?.disabled_pages || [];
            const isEnabled = !disabledPages.includes(path);
            return (
              <div key={path} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch checked={isEnabled} onCheckedChange={(v) => togglePage(path, v)} />
                )}
              </div>
            );
          })}
        </div>
      </div>}

      {/* Promo Banner */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Banner Promocional</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mostrar</span>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={bannerForm?.promo_banner_enabled ?? true}
                onCheckedChange={(v) => setBannerForm(f => ({ ...f, promo_banner_enabled: v }))}
              />
            )}
          </div>
        </div>
        {bannerForm && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Etiqueta superior (ej: Flash Sale)</p>
              <Input
                value={bannerForm.promo_banner_label}
                onChange={e => setBannerForm(f => ({ ...f, promo_banner_label: e.target.value }))}
                placeholder="Flash Sale"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Título principal</p>
              <Input
                value={bannerForm.promo_banner_title}
                onChange={e => setBannerForm(f => ({ ...f, promo_banner_title: e.target.value }))}
                placeholder="Up to 70% OFF"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subtítulo</p>
              <Input
                value={bannerForm.promo_banner_subtitle}
                onChange={e => setBannerForm(f => ({ ...f, promo_banner_subtitle: e.target.value }))}
                placeholder="Created by Alfred & Raquel"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Enlace al tocar (página o URL)</p>
              <Input
                value={bannerForm.promo_banner_link}
                onChange={e => setBannerForm(f => ({ ...f, promo_banner_link: e.target.value }))}
                placeholder="Browse (o https://...)"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={saveBanner} disabled={saving} className="w-full mt-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar banner'}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Métodos de Pago Habilitados</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Habilita o deshabilita los métodos de pago disponibles en el checkout.</p>
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ value, label, description, icon: Icon }) => {
            const isEnabled = allowedMethods.includes(value);
            return (
              <div key={value} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch checked={isEnabled} onCheckedChange={(v) => togglePaymentMethod(value, v)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Store Preview Modal */}
      {storePreviewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setStorePreviewUrl(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={storePreviewUrl} alt="Vista previa" className="w-full rounded-2xl" />
            <button
              onClick={() => setStorePreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
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