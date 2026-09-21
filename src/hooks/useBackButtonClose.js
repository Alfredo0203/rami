import { useEffect, useRef } from 'react';

// Module-level flag: set to true when we call history.back() internally
// (during overlay cleanup). Other popstate handlers can check isInternalBack()
// to avoid reacting to these programmatic back navigations.
// The flag is cleared via setTimeout(0) after the popstate event has been
// processed by all handlers.
let _internalBack = false;

export function isInternalBack() {
  return _internalBack;
}

// Module-level counter: tracks how many overlays/modals are currently open.
// useExitOnBack checks this to avoid showing the "press back to exit" toast
// when the user is actually closing an overlay/modal at the root page.
let _openOverlays = 0;

export function hasOpenOverlay() {
  return _openOverlays > 0;
}

/**
 * Lightweight hook that ONLY intercepts the back button to close an overlay.
 * Does NOT handle scroll locking (Radix/vaul already do that).
 * Used by shared UI components (Sheet, Dialog, Drawer, AlertDialog) for global
 * back-button-to-close behavior across all pages.
 *
 * @param {boolean} isOpen - Whether the overlay is open
 * @param {Function} onClose - Callback to close the overlay
 */
export function useBackButtonOverlay(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    _openOverlays++;
    window.history.pushState({ overlay: true }, '');

    const handlePopState = () => {
      if (_internalBack) return; // Don't close — this was a cleanup back()
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      _openOverlays = Math.max(0, _openOverlays - 1);
      if (window.history.state?.overlay) {
        _internalBack = true;
        window.history.back();
        // Clear the flag after popstate has been processed by all handlers.
        // popstate fires as a microtask, setTimeout(0) as a macrotask,
        // so popstate always runs first.
        setTimeout(() => { _internalBack = false; }, 0);
      }
    };
  }, [isOpen]);
}

/**
 * Hook that:
 * 1. Locks background scroll (works on iOS Safari, Android Chrome, desktop)
 * 2. Intercepts the browser back button to close the modal instead of navigating away
 *
 * @param {boolean} isOpen - Whether the modal/overlay is open
 * @param {Function} onClose - Callback to close the modal
 */
export function useBackButtonClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ── Scroll lock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Save current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Apply position:fixed trick (required for iOS Safari momentum scroll)
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // Restore scroll
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(scrollX, scrollY);
    };
  }, [isOpen]);

  // ── Back button interception ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    _openOverlays++;
    window.history.pushState({ modal: true }, '');

    const handlePopState = () => {
      if (_internalBack) return; // Don't close — this was a cleanup back()
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      _openOverlays = Math.max(0, _openOverlays - 1);
      if (window.history.state?.modal) {
        _internalBack = true;
        window.history.back();
        // Clear the flag after popstate has been processed by all handlers.
        setTimeout(() => { _internalBack = false; }, 0);
      }
    };
  }, [isOpen]);
}