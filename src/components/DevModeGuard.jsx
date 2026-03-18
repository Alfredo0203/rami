import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useTranslation } from './i18n/useTranslation';
import { Wrench } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'super_admin', 'owner'];
const HOME_PATH = createPageUrl('Home');

export default function DevModeGuard({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const [user, settings] = await Promise.all([
          base44.auth.me().catch(() => null),
          base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0]).catch(() => null),
        ]);

        if (cancelled) return;

        const devMode = settings?.development_mode === true;
        const isAdmin = user && ADMIN_ROLES.includes(user.role);
        const isHome = location.pathname === HOME_PATH || location.pathname === '/';
        const isAccount = location.pathname === '/Account';

        if (devMode && !isAdmin && !isHome && !isAccount) {
          setBlocked(true);
        } else {
          setBlocked(false);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (!checked) return null;

  if (blocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
          <Wrench className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{t('dev_mode_title')}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">{t('dev_mode_message')}</p>
        <button
          onClick={() => navigate(HOME_PATH)}
          className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold"
        >
          {t('dev_mode_go_home')}
        </button>
      </div>
    );
  }

  return children;
}