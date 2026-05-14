import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useTranslation } from './i18n/useTranslation';
import { Wrench, ShieldOff, RefreshCw } from 'lucide-react';

const SUPER_ADMIN_ROLES = ['super_admin', 'owner'];
const ADMIN_ROLES = ['admin', 'super_admin', 'owner'];
const SELLER_ROLES = ['seller'];
const HOME_PATH = createPageUrl('Home');
// Pages accessible without authentication (guest mode)
const GUEST_ALLOWED_PATHS = ['/Home', '/Browse', '/ProductDetail', '/Account', '/'];
const SELLER_ALLOWED_PATHS = ['/SellerDashboard', '/Home', '/Browse', '/Account', '/'];

const DEACTIVATION_REASON_LABELS = {
  self_deactivated: 'Desactivaste tu cuenta voluntariamente.',
  admin_deactivated: 'Tu cuenta fue desactivada por un administrador.',
  inactivity: 'Tu cuenta fue desactivada por inactividad.',
  policy_violation: 'Tu cuenta fue desactivada por violación de políticas.',
};

export default function DevModeGuard({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [deactivatedUser, setDeactivatedUser] = useState(null);
  const [requestingSent, setRequestingSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const [user, settings] = await Promise.all([
          base44.auth.me().catch(() => null),
          base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0]).catch(() => null),
        ]);

        if (cancelled) return;

        // Block deactivated users from everything except /reactivate
        if (user?.status === 'deactivated' && location.pathname !== '/reactivate') {
          setDeactivatedUser(user);
          setChecked(true);
          return;
        }

        const devMode = settings?.development_mode === true;
        const disabledPages = settings?.disabled_pages || [];
        const userRole = user?.role;
        const isSuperAdmin = userRole === 'super_admin' || userRole === 'owner';
        const isAnyAdmin = userRole === 'admin' || isSuperAdmin;
        const isSeller = userRole === 'seller';
        const isGuest = !user;
        const currentPage = location.pathname.replace('/', '');
        const isHome = location.pathname === '/' || currentPage === 'Home';
        const isAccount = currentPage === 'Account';
        const isAdminPanel = currentPage === 'Admin';

        // Any admin can always access the Admin panel (super_admin sees Settings tab within it)
        if (isAnyAdmin && isAdminPanel) {
          setBlocked(false);
          return;
        }

        // Super admins bypass all other restrictions
        if (isSuperAdmin) {
          setBlocked(false);
          return;
        }

        // Sellers: access their own dashboard + basic shop pages
        if (isSeller) {
          const isSellerAllowed = SELLER_ALLOWED_PATHS.some(p =>
            location.pathname === p || location.pathname.startsWith(p + '/')
          );
          if (!isSellerAllowed) {
            setBlocked(true);
            return;
          }
          setBlocked(false);
          return;
        }

        // Regular admins bypass most restrictions (except disabled pages above)
        if (isAnyAdmin) {
          setBlocked(false);
          return;
        }

        // For everyone else (including regular admin on non-Admin pages):
        // Block disabled pages
        if (disabledPages.includes(currentPage)) {
          setBlocked(true);
          return;
        }

        // Dev mode: block unknown pages (non-admin users only)
        if (devMode && !isAnyAdmin && !isHome && !isAccount) {
          const PAGES_CONFIG_PATHS = ['Browse', 'Cart', 'Orders', 'Checkout', 'Addresses', 'ProductDetail', 'OrderDetail', 'OrderConfirmation'];
          if (!PAGES_CONFIG_PATHS.includes(currentPage)) {
            setBlocked(true);
            return;
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

  if (deactivatedUser) {
    const reason = deactivatedUser.status_reason;
    const reasonLabel = DEACTIVATION_REASON_LABELS[reason] || 'Tu cuenta ha sido desactivada.';

    const handleRequestReactivation = async () => {
      if (requestingSent) return;
      try {
        await base44.functions.invoke('requestAccountReactivation', {});
        setRequestingSent(true);
      } catch {
        setRequestingSent(true); // aun así muestra confirmación
      }
    };

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">Cuenta desactivada</h1>
          <p className="text-sm text-muted-foreground max-w-xs">{reasonLabel}</p>
        </div>
        {!requestingSent ? (
          <button
            onClick={handleRequestReactivation}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-semibold shadow"
          >
            <RefreshCw className="w-4 h-4" />
            Solicitar reactivación
          </button>
        ) : (
          <div className="bg-success/10 text-success rounded-xl px-5 py-3 text-sm font-medium max-w-xs">
            ✅ Te enviamos un enlace de reactivación a tu correo.
          </div>
        )}
        <button
          onClick={() => base44.auth.logout('/')}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

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