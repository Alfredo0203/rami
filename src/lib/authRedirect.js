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
// Custom domain connected to this app — used as the OAuth redirect base so the
// platform accepts the from_url when custom Google OAuth is enabled.
// (rami-shop.base44.app is rejected with "invalid redirect domain" when custom
// OAuth is configured; the authorized custom domain must be used instead.)
const CUSTOM_DOMAIN = 'https://rami-shop.com';

export function getAuthRedirectUrl(path = '/') {
  // Always use the custom domain for OAuth redirects — it's the authorized
  // domain in Google Cloud Console and the connected domain in Base44.
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  try {
    return new URL(cleanPath, CUSTOM_DOMAIN).toString();
  } catch {
    return `${CUSTOM_DOMAIN}${cleanPath}`;
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