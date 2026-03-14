import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const HOME_PATH = createPageUrl('Home');

/**
 * On the Home page, intercepts the browser back button and shows
 * a confirmation dialog instead of navigating away.
 * Returns { showExitDialog, setShowExitDialog, handleExit }.
 */
export function useBackExitConfirm() {
  const location = useLocation();
  const isHome = location.pathname === HOME_PATH || location.pathname === '/';
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    if (!isHome) return;

    // Push a dummy history entry so the back button can be caught
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e) => {
      // Push again to prevent actual navigation
      window.history.pushState(null, '', window.location.href);
      setShowExitDialog(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHome]);

  const handleExit = () => {
    // Best-effort: close the tab / PWA window
    window.close();
    // Fallback for browsers that block window.close()
    // Navigate to a blank page (effectively "exits" the SPA)
    window.location.href = 'about:blank';
  };

  return { showExitDialog, setShowExitDialog, handleExit };
}