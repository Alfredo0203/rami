import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/useTranslation';

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

  const toggleDevMode = async (value) => {
    setSaving(true);
    try {
      const payload = {
        key: 'global',
        development_mode: value,
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
      toast.success(value ? 'Development mode enabled' : 'Development mode disabled');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const devMode = settings?.development_mode === true;

  return (
    <div className="space-y-4 mt-3 pb-6">
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
    </div>
  );
}