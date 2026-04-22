import { useEffect } from 'react';

/**
 * Hook that:
 * 1. Locks background scroll (works on iOS Safari, Android Chrome, desktop)
 * 2. Intercepts the browser back button to close the modal instead of navigating away
 *
 * @param {boolean} isOpen - Whether the modal/overlay is open
 * @param {Function} onClose - Callback to close the modal
 */
export function useBackButtonClose(isOpen, onClose) {
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

    window.history.pushState({ modal: true }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}