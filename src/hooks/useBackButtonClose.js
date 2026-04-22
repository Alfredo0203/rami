import { useEffect } from 'react';

/**
 * Hook that intercepts the browser/native back button to close a modal/overlay
 * instead of navigating away. Also locks body scroll when active.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 */
export function useBackButtonClose(isOpen, onClose) {
  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Intercept back button
  useEffect(() => {
    if (!isOpen) return;

    // Push a dummy state so pressing back hits this state first
    window.history.pushState({ modal: true }, '');

    const handlePopState = (e) => {
      onClose();
      // Don't let the browser navigate further back
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the modal is closed programmatically (not by back button),
      // we need to go back one step to remove the dummy state
      if (window.history.state?.modal) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}