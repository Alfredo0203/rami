import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { canGoBack } from '@/lib/navigation';

// Root-level pages where pressing back should offer to exit the app
const ROOT_PATHS = ['/', '/Home'];

/**
 * Implements "press back twice to exit" on root-level pages.
 *
 * Pushes a guard history entry only when the user is at the true root
 * (no previous page to go back to). This ensures the hardware back button
 * fires popstate instead of the native shell silently ignoring it.
 *
 * On first back press at root: shows a toast prompting to press again.
 * On second press within 2 seconds: attempts to close the app.
 *
 * Normal navigation (e.g. going back from ProductDetail to Home) is NOT
 * intercepted — the guard is only (re)pushed when canGoBack() is false.
 */
export function useExitOnBack() {
  const location = useLocation();
  const exitTimer = useRef(null);
  const lastPathRef = useRef(location.pathname);

  // Keep lastPathRef in sync — runs AFTER the popstate handler, so the
  // handler always sees the *previous* path for comparison.
  useEffect(() => {
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  // Push guard when at the true root (no previous page to go back to)
  useEffect(() => {
    const isRoot = ROOT_PATHS.includes(location.pathname);
    if (isRoot && !canGoBack() && !window.history.state?.exitGuard) {
      window.history.pushState({ exitGuard: true }, '');
    }
  }, [location.pathname]);

  // Global popstate handler for the exit gesture
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const isRoot = ROOT_PATHS.includes(currentPath);
      if (!isRoot) return;

      // If the path didn't change, the user was already on root and pressed
      // back (the guard was consumed) — this is an exit gesture.
      // If the path changed, the user navigated back to root from another
      // page — normal navigation, the guard effect will re-push the guard.
      const wasSameRoot = currentPath === lastPathRef.current;

      if (!wasSameRoot) return;

      if (exitTimer.current) {
        // Second press within 2 seconds — attempt to exit
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
        try { window.close(); } catch {}
        // Don't re-push guard — if window.close() didn't work, the next
        // hardware back press exits via the native shell (no guard = no
        // extra history entry = canGoBack is false).
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