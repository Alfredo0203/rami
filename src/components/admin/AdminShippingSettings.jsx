import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminShippingSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shippingCost, setShippingCost] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: 'global' })
      .then(results => {
        const s = results[0];
        setSettings(s || null);
        setShippingCost(String(s?.shipping_cost ?? 0));
        setFreeShippingThreshold(String(s?.free_shipping_threshold ?? 0));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        shipping_cost: parseFloat(shippingCost) || 0,
        free_shipping_threshold: parseFloat(freeShippingThreshold) || 0,
        updated_at: new Date().toISOString(),
      };
      if (settings?.id) {
        const updated = await base44.entities.AppSettings.update(settings.id, patch);
        setSettings(updated);
      } else {
        const created = await base44.entities.AppSettings.create({ key: 'global', ...patch });
        setSettings(created);
      }
      toast.success('Configuración de envío guardada');
    } catch (err) {
      console.error('Shipping settings error:', err);
      toast.error(err?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Configuración de Envío</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Define el costo de envío y a partir de qué monto es gratis.</p>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Costo de envío ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={e => setShippingCost(e.target.value)}
            placeholder="0.00"
            className="h-9 text-sm mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Si es 0, el envío es siempre gratis.</p>
        </div>
        <div>
          <Label className="text-xs">Envío gratis a partir de ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={freeShippingThreshold}
            onChange={e => setFreeShippingThreshold(e.target.value)}
            placeholder="0.00"
            className="h-9 text-sm mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Si es 0, no aplica envío gratis por monto.</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar configuración de envío'}
        </Button>
      </div>
    </div>
  );
}