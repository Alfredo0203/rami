import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench, CreditCard, Banknote, LayoutDashboard, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/useTranslation';

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
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerForm, setBannerForm] = useState({ enabled: true, badge_text: '', title: '', subtitle: '', link_url: '' });
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: 'global' })
      .then(results => {
        const s = results[0] || null;
        setSettings(s);
        if (s?.promo_banner) setBannerForm({ enabled: true, badge_text: '', title: '', subtitle: '', link_url: '', ...s.promo_banner });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (patch) => {
    setSaving(true);
    try {
      const payload = { key: 'global', ...settings, ...patch, updated_by: currentUser?.email, updated_at: new Date().toISOString() };
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

  const saveBanner = async () => {
    setSavingBanner(true);
    try {
      const payload = { key: 'global', ...settings, promo_banner: bannerForm, updated_by: currentUser?.email, updated_at: new Date().toISOString() };
      if (settings?.id) {
        const updated = await base44.entities.AppSettings.update(settings.id, payload);
        setSettings(updated);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettings(created);
      }
      toast.success('Banner actualizado');
    } catch {
      toast.error('Error al guardar el banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const toggleDevMode = (value) => saveSettings({ development_mode: value });

  const togglePage = (path, enabled) => {
    const current = settings?.disabled_pages || [];
    const updated = enabled ? current.filter(p => p !== path) : [...new Set([...current, path])];
    saveSettings({ disabled_pages: updated });
  };

  const togglePaymentMethod = (method, enabled) => {
    const current = settings?.allowed_payment_methods || ['credit_card'];
    const updated = enabled ? [...new Set([...current, method])] : current.filter(m => m !== method);
    if (updated.length === 0) { toast.error('Debe haber al menos un método de pago habilitado'); return; }
    saveSettings({ allowed_payment_methods: updated });
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const devMode = settings?.development_mode === true;
  const allowedMethods = settings?.allowed_payment_methods || ['credit_card'];

  return (
    <div className="space-y-4 mt-3 pb-6">

      {/* Promo Banner */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Banner Promocional</p>
          <div className="ml-auto">
            <Switch
              checked={bannerForm.enabled}
              onCheckedChange={(v) => setBannerForm(f => ({ ...f, enabled: v }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Texto que aparece en el banner de la pantalla de inicio.</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Etiqueta (badge)</label>
            <Input
              placeholder="Flash Sale"
              value={bannerForm.badge_text}
              onChange={(e) => setBannerForm(f => ({ ...f, badge_text: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título principal</label>
            <Input
              placeholder="Up to 70% OFF"
              value={bannerForm.title}
              onChange={(e) => setBannerForm(f => ({ ...f, title: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subtítulo</label>
            <Input
              placeholder="Created by Alfred & Raquel"
              value={bannerForm.subtitle}
              onChange={(e) => setBannerForm(f => ({ ...f, subtitle: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Enlace al tocar (opcional)</label>
            <Input
              placeholder="/Browse o https://..."
              value={bannerForm.link_url}
              onChange={(e) => setBannerForm(f => ({ ...f, link_url: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={saveBanner} disabled={savingBanner} className="mt-1 w-full">
            {savingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar banner'}
          </Button>
        </div>
      </div>

      {/* Dev Mode */}
      <div className="bg-card rounded-xl p-4 shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Wrench className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t('admin_dev_mode')}</p>
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Switch checked={devMode} onCheckedChange={toggleDevMode} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('admin_dev_mode_desc')}</p>
          {devMode && <p className="text-xs text-warning font-medium mt-2">⚠️ El modo desarrollo está activo. Los usuarios regulares solo pueden acceder al Inicio.</p>}
          {settings?.updated_by && <p className="text-[10px] text-muted-foreground mt-1">Última actualización por {settings.updated_by}</p>}
        </div>
      </div>

      {/* Page Visibility */}
      {devMode && (
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Visibilidad de Pantallas</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Habilita o deshabilita pantallas para usuarios regulares.</p>
          <div className="space-y-3">
            {PAGES_CONFIG.map(({ path, label, description }) => {
              const isEnabled = !(settings?.disabled_pages || []).includes(path);
              return (
                <div key={path} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Switch checked={isEnabled} onCheckedChange={(v) => togglePage(path, v)} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Switch checked={isEnabled} onCheckedChange={(v) => togglePaymentMethod(value, v)} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}