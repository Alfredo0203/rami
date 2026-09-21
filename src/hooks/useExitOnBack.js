import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { canGoBack } from '@/lib/navigation';
import { hasOpenOverlay, isInternalBack } from '@/hooks/useBackButtonClose';

// Root-level pages where pressing back should offer to exit the app
const ROOT_PATHS = ['/', '/Home'];

/**
 * Implements "press back twice to exit" on root-level pages for native
 * Android WebView (Base44 native build).
 *
 * HOW IT WORKS:
 *
 * 1. A "guard" history entry is pushed ONLY when the user is at the true
 *    root (canGoBack() is false). This ensures the hardware back button
 *    fires popstate instead of the native shell silently ignoring it.
 *
 * 2. When the user navigates back from a subpage and lands on the guard
 *    (same URL as Home), the guard is auto-skipped via history.back() so
 *    the user lands on the real Home page without an extra back press.
 *
 * 3. When the user is on Home and presses back (guard consumed):
 *    - First press: shows "press back again to exit" toast + re-pushes guard.
 *    - Second press within 2s: tries window.close() / navigator.app.exitApp().
 *      Does NOT re-push guard, so canGoBack() is false and the next hardware
 *      back press exits via the native shell.
 *
 * 4. Normal navigation (e.g. going back from ProductDetail to Home) is NOT
 *    intercepted — the guard is only (re)pushed when canGoBack() is false.
 */
export function useExitOnBack() {
  const location = useLocation();
  const exitTimer = useRef(null);
  const lastPathRef = useRef(location.pathname);
  const skippingGuard = useRef(false);

  // Keep lastPathRef in sync — runs AFTER the popstate handler, so the
  // handler always sees the *previous* path for comparison.
  useEffect(() => {
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  // Push guard when at the true root (no previous page to go back to).
  // trackNavigation runs BEFORE this effect (it's registered first in
  // AuthenticatedApp), so canGoBack() is accurate here.
  useEffect(() => {
    const isRoot = ROOT_PATHS.includes(location.pathname);
    if (isRoot && !canGoBack() && !window.history.state?.exitGuard) {
      window.history.pushState({ exitGuard: true }, '');
    }
  }, [location.pathname]);

  // Global popstate handler for the exit gesture
  useEffect(() => {
    const handlePopState = () => {
      // Don't react if an overlay/modal is open (let it handle the back press)
      // or if this is a programmatic back() from overlay cleanup.
      if (hasOpenOverlay() || isInternalBack()) return;

      const currentPath = window.location.pathname;
      const isRoot = ROOT_PATHS.includes(currentPath);
      if (!isRoot) return;

      // Auto-skip completion: we just called history.back() to skip the
      // guard. Now we're on the real Home. Push a fresh guard for the
      // exit gesture and return.
      if (skippingGuard.current) {
        skippingGuard.current = false;
        if (!window.history.state?.exitGuard) {
          window.history.pushState({ exitGuard: true }, '');
        }
        return;
      }

      const wasSameRoot = currentPath === lastPathRef.current;

      // If the user navigated back from a subpage and landed on the guard
      // (same URL as Home but state has exitGuard), auto-skip it so they
      // land on the real Home page without an extra back press.
      if (!wasSameRoot && window.history.state?.exitGuard) {
        skippingGuard.current = true;
        window.history.back();
        return;
      }

      // If the path changed (normal navigation to root), don't intercept.
      if (!wasSameRoot) return;

      // --- Exit gesture: user was on root and pressed back (guard consumed) ---
      if (exitTimer.current) {
        // Second press within 2 seconds — attempt to exit
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
        // Try every available exit method (different WebView shells support
        // different APIs). window.close() works in some; Cordova/Capacitor
        // shells expose navigator.app.exitApp().
        try { window.close(); } catch {}
        try { navigator.app?.exitApp?.(); } catch {}
        try { navigator.device?.exitApp?.(); } catch {}
        // Don't re-push guard — if none of the above worked, canGoBack() is
        // now false, so the next hardware back press exits via the native shell.
      } else {
        // First press — show toast and re-push guard so popstate fires again
        toast('Presiona atrás de nuevo para salir', { duration: 2000 });
        window.history.pushState({ exitGuard: true }, '');
        exitTimer.current = setTimeout(() => {
          exitTimer.current = null;
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);
}