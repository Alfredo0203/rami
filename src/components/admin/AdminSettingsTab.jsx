import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wrench, CreditCard, Banknote, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/useTranslation';

const PAGES_CONFIG = [
  { path: 'Browse', label: 'Browse / Catálogo', description: 'Explorar productos por categoría' },
  { path: 'Cart', label: 'Carrito', description: 'Ver y gestionar el carrito de compras' },
  { path: 'Orders', label: 'Mis Pedidos', description: 'Historial de órdenes del usuario' },
  { path: 'Checkout', label: 'Checkout', description: 'Proceso de pago y confirmación' },
  { path: 'Addresses', label: 'Mis Direcciones', description: 'Gestión de direcciones de envío' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Card Payment', description: 'Credit / Debit card via payment gateway', icon: CreditCard },
  { value: 'cash_on_delivery', label: 'Cash on Delivery', description: 'Customer pays when order is delivered', icon: Banknote },
];

export default function AdminSettingsTab({ currentUser }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: 'global' })
      .then(results => setSettings(results[0] || null))
      .finally(() => setLoading(false));
  }, []);

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
      toast.success('Settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

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
      toast.error('At least one payment method must be enabled');
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
              ⚠️ Development mode is currently ON. Regular users are restricted to the Home screen.
            </p>
          )}
          {settings?.updated_by && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last updated by {settings.updated_by}
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

      {/* Payment Methods */}
      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Allowed Payment Methods</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Enable or disable payment methods available at checkout.</p>
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
    </div>
  );
}