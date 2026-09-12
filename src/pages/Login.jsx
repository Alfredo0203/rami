import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// Detect if running inside a native app WebView (Google blocks OAuth in embedded WebViews)
const isNativeWebView = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Android WebView: has "wv" or "WebView" but not standalone Chrome
  const isAndroid = /Android/i.test(ua);
  const isAndroidWv = isAndroid && (/; wv\)/i.test(ua) || (/Version\/\d/i.test(ua) && !/Chrome\/\d/i.test(ua)));
  // iOS WebView: has "iPhone/iPad" but not "Safari" (Safari = external browser)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isIOSWv = isIOS && !/Safari\/\d/i.test(ua);
  return isAndroidWv || isIOSWv;
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [mode, setMode] = useState('login'); // login | register | otp | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectAfterAuth = () => {
    // Full page reload to the target — ensures the app re-initializes with the token
    const target = from.startsWith('/') ? from : '/';
    window.location.href = target;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await base44.auth.loginViaEmailPassword(email, password);
      toast.success(`Bienvenido${user?.full_name ? ', ' + user.full_name : ''}`);
      redirectAfterAuth();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Credenciales inválidas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setMode('otp');
      toast.success('Código de verificación enviado a tu correo');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'No se pudo registrar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email, otpCode });
      const { user } = await base44.auth.loginViaEmailPassword(email, password);
      toast.success(`Cuenta verificada. Bienvenido${user?.full_name ? ', ' + user.full_name : ''}`);
      redirectAfterAuth();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Código incorrecto';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await base44.auth.resendOtp(email);
      toast.success('Código reenviado');
    } catch (err) {
      toast.error('No se pudo reenviar el código');
    }
  };

  const handleGoogleLogin = () => {
    const returnUrl = from.startsWith('/') ? from : '/';
    
    if (isNativeWebView()) {
      // In native app WebView: Google blocks OAuth in embedded WebViews.
      // Open the OAuth flow in the device's external browser instead.
      const redirectUrl = window.location.origin + returnUrl;
      const config = base44.getConfig();
      const loginUrl = `${window.location.origin}/api/apps/auth/login?app_id=${config.appId}&from_url=${encodeURIComponent(redirectUrl)}`;
      // Try window.open — native wrappers typically intercept this to open external browser
      const popup = window.open(loginUrl, '_blank');
      if (!popup) {
        // Popup blocked — try direct navigation as fallback
        window.location.href = loginUrl;
      }
      return;
    }
    
    base44.auth.loginWithProvider('google', returnUrl);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      toast.success('Revisa tu correo para restablecer tu contraseña');
      setMode('login');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'No se pudo enviar el correo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="safe-area-top sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4">
          <button
            onClick={() => navigate(from.startsWith('/') ? from : '/')}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta'}
            {mode === 'otp' && 'Verificar Código'}
            {mode === 'forgot' && 'Recuperar Contraseña'}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Inicia sesión para continuar con tu compra
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10 h-12"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-12 text-base gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </Button>

              <div className="flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('forgot'); }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('register'); }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿No tienes cuenta? <span className="text-primary font-medium">Regístrate</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Crea tu cuenta para disfrutar de una mejor experiencia
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10 h-12"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-12 text-base gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Registrarse con Google
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('login'); }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿Ya tienes cuenta? <span className="text-primary font-medium">Inicia sesión</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Hemos enviado un código de verificación a<br />
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Código de verificación</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="h-12 text-center text-lg tracking-widest"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar y Continuar'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿No recibiste el código? <span className="text-primary font-medium">Reenviar</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Te enviaremos un enlace para restablecer tu contraseña
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10 h-12"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Enlace'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(''); setMode('login'); }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Volver a iniciar sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}