import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/shop/BottomNav';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Package, MapPin, Heart, LogOut, ChevronRight, Shield, Loader2, Trash2, AlertTriangle, LogIn, Globe } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useScrollRestoration } from '../components/useScrollRestoration';
import { useTranslation } from '../components/i18n/useTranslation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import LanguageSelector from '../components/i18n/LanguageSelector';

const ROLE_LABELS = { user: 'Cliente', admin: 'Admin', super_admin: 'Propietario' };
const STATUS_STYLES = {
  active: null,
  suspended: 'bg-warning/10 border border-warning/30 text-warning',
  deactivated: 'bg-destructive/10 border border-destructive/30 text-destructive',
};

export default function Account() {
  useScrollRestoration();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    // Clear user cache so the app treats them as guest
    queryClient.setQueryData(['currentUser'], null);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    // Logout without redirect — user stays as guest
    base44.auth.logout(window.location.origin + '/Home');
    toast('Cerraste tu sesión. Podés seguir explorando como invitado.', {
      duration: 4000,
    });
  };

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const menuItems = [
    { icon: Package, label: t('my_orders'), page: 'Orders' },
    { icon: MapPin, label: t('my_addresses'), page: 'Addresses' },
    { icon: Heart, label: 'Mis favoritos', page: 'Wishlist' },
  ];

  if (user?.role === 'admin' || user?.role === 'super_admin') {
    menuItems.push({ icon: Shield, label: t('admin_panel'), page: 'Admin' });
  }

  const handleDeleteAccount = async () => {
    if (deleteEmail.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      toast.error('El correo no coincide con el de tu cuenta');
      return;
    }
    setDeleting(true);
    try {
      await base44.entities.User.update(user.id, {
        status: 'deactivated',
        status_reason: 'Self-requested account deactivation',
        status_changed_at: new Date().toISOString(),
      });
      toast.success('Cuenta desactivada. Tus datos se conservan para auditoría.');
      setTimeout(() => base44.auth.logout(), 1500);
    } catch {
      toast.error('Error al desactivar la cuenta');
      setDeleting(false);
    }
  };

  const isRegularUser = user?.role === 'user';
  const userStatus = user?.status || 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guest screen
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div style={{ background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))', paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))' }} className="px-4 pb-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground mb-1">¡Hola! 👋</h1>
          <p className="text-primary-foreground/80 text-sm">Inicia sesión para ver tus pedidos, guardar direcciones y más.</p>
        </div>
        <div className="px-4 -mt-5 space-y-3">
          <Button
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-full text-base shadow-lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Iniciar sesión / Crear cuenta
          </Button>
          <p className="text-center text-xs text-muted-foreground">Puedes seguir explorando productos sin iniciar sesión.</p>
        </div>
        <BottomNav cartCount={0} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pb-6" style={{ background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))', paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">{user?.full_name || 'Invitado'}</h1>
            <p className="text-sm text-primary-foreground/70">{user?.email || ''}</p>
            <span className="text-[11px] font-medium text-primary-foreground/60 bg-primary-foreground/10 px-2 py-0.5 rounded-full mt-1 inline-block">
              {ROLE_LABELS[user?.role] || 'Cliente'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-3">
        {userStatus !== 'active' && (
          <div className={`flex items-start gap-2 rounded-xl p-3 ${STATUS_STYLES[userStatus]}`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold capitalize">
                {t(userStatus === 'suspended' ? 'account_suspended' : 'account_deactivated')}
              </p>
              {user?.status_reason && (
                <p className="text-xs opacity-80">{user.status_reason}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          <div className="flex items-center gap-3 p-4 border-t border-border">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground flex-1">{t('language')}</span>
            <LanguageSelector />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">{t('sign_out')}</span>
        </button>

        {isRegularUser && (
          <>
            <button
              onClick={() => setDeleteOpen(true)}
              className="w-full flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">{t('deactivate_account')}</span>
            </button>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deactivate_title')}</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>{t('deactivate_description')}</p>
                      <p className="font-medium text-foreground">{t('deactivate_confirm_email')}</p>
                      <input
                        type="email"
                        value={deleteEmail}
                        onChange={e => setDeleteEmail(e.target.value)}
                        placeholder={user?.email || 'your@email.com'}
                        className="w-full text-sm px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteEmail('')}>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteEmail.trim().toLowerCase() !== user?.email?.toLowerCase()}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('deactivate_confirm_btn')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      <BottomNav cartCount={cartCount} />
    </div>
  );
}