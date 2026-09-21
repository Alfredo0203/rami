import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { hasOpenOverlay, isInternalBack } from '@/hooks/useBackButtonClose';

// Root-level pages where pressing back should offer to exit the app
const ROOT_PATHS = ['/', '/Home'];

/**
 * Implements "press back twice to exit" on root-level pages for native
 * Android WebView (Base44 native build).
 *
 * DESIGN (simplified — no auto-skip, no cascading popstates):
 *
 * 1. A "guard" history entry is pushed on every root page mount. This
 *    ensures the hardware back button fires popstate instead of the
 *    native shell silently ignoring it.
 *
 * 2. When popstate fires on a root page:
 *    - If the previous path was DIFFERENT (arrived from a subpage): just
 *      re-push a guard. The user is now on root with a guard. This is
 *      normal back navigation — don't show the exit toast.
 *    - If the previous path was the SAME (was already on root, pressed
 *      back and consumed the guard): this is the exit gesture.
 *      First press → toast + re-push guard. Second press within 2s → exit.
 *
 * 3. No history.back() is ever called inside the popstate handler, which
 *    avoids cascading popstates that conflict with React Router and other
 *    popstate handlers (e.g. useBackButtonClose for overlays/modals).
 *
 * 4. Overlay/modal back-presses are ignored via hasOpenOverlay() so closing
 *    a modal doesn't trigger the exit toast.
 */
export function useExitOnBack() {
  const location = useLocation();
  const exitTimer = useRef(null);
  const lastPathRef = useRef(location.pathname);

  // Keep lastPathRef in sync — runs AFTER the popstate handler (effects run
  // after event listeners), so the handler always sees the *previous* path.
  useEffect(() => {
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  // Push guard on root pages so the hardware back button fires popstate.
  useEffect(() => {
    const isRoot = ROOT_PATHS.includes(location.pathname);
    if (isRoot && !window.history.state?.exitGuard) {
      window.history.pushState({ exitGuard: true }, '');
    }
  }, [location.pathname]);

  // Global popstate handler for the exit gesture
  useEffect(() => {
    const handlePopState = () => {
      // Don't react if an overlay/modal is open (let it handle the back
      // press) or if this is a programmatic back() from overlay cleanup.
      if (hasOpenOverlay() || isInternalBack()) return;

      const currentPath = window.location.pathname;
      const isRoot = ROOT_PATHS.includes(currentPath);
      if (!isRoot) return;

      const wasSameRoot = currentPath === lastPathRef.current;

      if (!wasSameRoot) {
        // Arrived at root from a different page — re-establish the guard
        // so the next back press triggers the exit gesture. Don't show
        // the toast (this is normal back navigation, not an exit attempt).
        if (!window.history.state?.exitGuard) {
          window.history.pushState({ exitGuard: true }, '');
        }
        return;
      }

      // --- Exit gesture: user was on root and pressed back (guard consumed) ---
      if (exitTimer.current) {
        // Second press within 2 seconds — attempt to exit
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
        try { window.close(); } catch {}
        try { navigator.app?.exitApp?.(); } catch {}
        try { navigator.device?.exitApp?.(); } catch {}
        // Don't re-push guard — if none of the above worked, the next
        // hardware back press exits via the native shell.
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