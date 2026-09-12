import { appParams } from '@/lib/app-params';

/**
 * Builds a redirect URL for base44.auth.redirectToLogin().
 *
 * In native app WebViews, window.location.origin can be a non-http scheme
 * (e.g. capacitor://localhost, file://) that the platform login page cannot
 * redirect back to — so the user stays stuck on the login page.
 *
 * On custom domains, the platform login page may not accept a from_url on a
 * different origin than the app's base URL.
 *
 * This utility resolves the redirect against appParams.appBaseUrl (the URL the
 * platform knows about) when available, falling back to window.location.origin
 * for standard http(s) origins.
 */
export function getAuthRedirectUrl(path = '/') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isHttpOrigin = origin.startsWith('http://') || origin.startsWith('https://');

  // Prefer the platform-known base URL so the login page can always redirect back
  const base = appParams.appBaseUrl || (isHttpOrigin ? origin : '');

  if (base) {
    try {
      return new URL(path, base).toString();
    } catch {
      // fall through
    }
  }

  // Last resort: use current origin
  try {
    return new URL(path, origin).toString();
  } catch {
    return path;
  }
}

/**
 * Logs out locally by clearing the token from localStorage and reloading.
 * Avoids the platform's server-side logout redirect which can get stuck
 * on the web page in native app WebViews.
 */
export function localLogout(redirectPath = '/') {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('base44_access_token');
      window.localStorage.removeItem('token');
    } catch (e) {
      console.error('Failed to clear token:', e);
    }
    window.location.href = redirectPath;
  }
}