import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useTranslation } from './i18n/useTranslation';
import { Wrench } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'super_admin', 'owner'];
const HOME_PATH = createPageUrl('Home');
// Pages accessible without authentication (guest mode)
const GUEST_ALLOWED_PATHS = ['/Home', '/Browse', '/ProductDetail', '/Account', '/'];

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
        const disabledPages = settings?.disabled_pages || [];
        const isAdmin = user && ADMIN_ROLES.includes(user.role);
        const isGuest = !user;
        const isHome = location.pathname === HOME_PATH || location.pathname === '/';
        const isAccount = location.pathname === '/Account';

        // Disabled pages: block non-admins from disabled pages (applies both in dev mode and normal mode)
        if (!isAdmin) {
          const currentPage = location.pathname.replace('/', '');
          if (disabledPages.includes(currentPage)) {
            setBlocked(true);
            return;
          }
          // Dev mode: additionally block pages that are NOT explicitly listed (i.e. not in PAGES_CONFIG) when devMode is on
          // But Home and Account are always allowed
          if (devMode && !isHome && !isAccount) {
            const PAGES_CONFIG_PATHS = ['Browse', 'Cart', 'Orders', 'Checkout', 'Addresses'];
            const isKnownPage = PAGES_CONFIG_PATHS.includes(currentPage);
            // If it's a known page and NOT disabled, allow it. If it's unknown (not in config), block it.
            if (!isKnownPage) {
              setBlocked(true);
              return;
            }
          }
        }

        // Guest mode: redirect to login for private pages
        if (isGuest) {
          const currentPath = location.pathname;
          const isGuestAllowed = GUEST_ALLOWED_PATHS.some(p => currentPath.startsWith(p));
          if (!isGuestAllowed) {
            base44.auth.redirectToLogin(window.location.href);
            return;
          }
        }

        setBlocked(false);
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