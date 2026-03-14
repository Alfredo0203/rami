import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const HOME_PATH = createPageUrl('Home');

/**
 * On the Home page ONLY, intercepts the hardware/browser back button
 * and shows a confirmation dialog before exiting the app.
 *
 * On any other page, does nothing — React Router handles navigation normally.
 */
export function useBackExitConfirm() {
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const isHome = location.pathname === HOME_PATH || location.pathname === '/';
  const guardActive = useRef(false);

  useEffect(() => {
    if (!isHome) {
      // Not on home — make sure we leave no ghost state
      guardActive.current = false;
      return;
    }

    // Push a sentinel entry so the back press gives us a popstate event
    // instead of immediately leaving the app.
    window.history.pushState({ exitGuard: true }, '');
    guardActive.current = true;

    const handlePopState = (e) => {
      if (!guardActive.current) return;

      // Re-push so pressing back again still triggers the dialog
      window.history.pushState({ exitGuard: true }, '');
      setShowExitDialog(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      guardActive.current = false;
    };
  }, [isHome]);

  const handleExit = () => {
    setShowExitDialog(false);
    // For Capacitor/Cordova native Android
    if (window.navigator && window.navigator.app && window.navigator.app.exitApp) {
      window.navigator.app.exitApp();
      return;
    }
    // PWA / browser fallback
    try { window.close(); } catch (_) {}
    // Last resort: navigate away
    setTimeout(() => { window.location.href = 'about:blank'; }, 100);
  };

  return { showExitDialog, setShowExitDialog, handleExit };
}