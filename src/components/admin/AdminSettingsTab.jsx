import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wrench, CreditCard, Banknote, LayoutDashboard, Megaphone, MessageCircle, Shield, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  { value: 'credit_card', label: 'Pago con Tarjeta', description: 'Tarjeta de crédito / débito vía Stripe', icon: CreditCard },
  { value: 'wompi', label: 'Wompi', description: 'Pago seguro en línea con Wompi El Salvador', icon: Shield },
  { value: 'cash_on_delivery', label: 'Efectivo', description: 'El cliente paga cuando recibe el pedido', icon: Banknote },
];

export default function AdminSettingsTab({ currentUser }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  


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
    if (settings && whatsappPhone === '') {
      setWhatsappPhone(settings.whatsapp_phone ?? '+50370000000');
    }
    if (settings && logoUrl === '') {
      setLogoUrl(settings.logo_url ?? '');
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

       {/* Logo */}
       <div className="bg-card rounded-xl p-4 shadow-sm">
         <div className="flex items-center gap-2 mb-3">
           <Image className="w-4 h-4 text-primary" />
           <p className="text-sm font-semibold text-foreground">Logo de la Tienda</p>
         </div>
         <p className="text-xs text-muted-foreground mb-3">URL de la imagen del logo (se usa en facturas PDF y emails).</p>
         {logoUrl && (
           <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-3 rounded border border-border p-1" />
         )}
         <div className="space-y-2">
           <Input
             value={logoUrl}
             onChange={e => setLogoUrl(e.target.value)}
             placeholder="https://..."
             className="h-9 text-sm"
           />
           <Button
             size="sm"
             onClick={() => saveSettings({ logo_url: logoUrl })}
             disabled={saving}
             className="w-full mt-2"
           >
             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar logo'}
           </Button>
         </div>
       </div>

       {/* WhatsApp Support */}
       <div className="bg-card rounded-xl p-4 shadow-sm">
         <div className="flex items-center gap-2 mb-3">
           <MessageCircle className="w-4 h-4 text-primary" />
           <p className="text-sm font-semibold text-foreground">WhatsApp de Soporte</p>
         </div>
         <p className="text-xs text-muted-foreground mb-3">Número de teléfono para el chat de soporte en WhatsApp.</p>
         <div className="space-y-2">
           <Label htmlFor="whatsapp" className="text-xs">Número de teléfono (formato: +503XXXXXXXX)</Label>
           <Input
             id="whatsapp"
             value={whatsappPhone}
             onChange={e => setWhatsappPhone(e.target.value)}
             placeholder="+50370000000"
             className="h-9 text-sm"
           />
           <Button
             size="sm"
             onClick={() => saveSettings({ whatsapp_phone: whatsappPhone })}
             disabled={saving}
             className="w-full mt-2"
           >
             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar número'}
           </Button>
         </div>
       </div>


    </div>
  );
}