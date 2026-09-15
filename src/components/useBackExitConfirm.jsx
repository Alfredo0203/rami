import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const HOME_PATH = createPageUrl('Home');

function getExitMessage() {
  const lang = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  if (lang.startsWith('es')) return 'Presiona atrás de nuevo para salir';
  if (lang.startsWith('pt')) return 'Pressione voltar novamente para sair';
  return 'Press back again to exit';
}

/**
 * Global back-button handler for native Android WebView.
 *
 * - On inner pages: lets React Router handle back navigation naturally
 *   (the WebView's back button triggers popstate, Router navigates back).
 * - On Home: first back press shows a toast and pushes a new history entry
 *   to prevent the app from exiting; second press within 2s exits.
 *
 * No sentinel is pushed on mount — that was what broke back navigation
 * from inner pages back to Home.
 */
export function useBackExitConfirm() {
  const location = useLocation();
  const isHome = location.pathname === HOME_PATH || location.pathname === '/';
  const isHomeRef = useRef(isHome);
  isHomeRef.current = isHome;
  const backPressedOnce = useRef(false);
  const resetTimer = useRef(null);

  useEffect(() => {
    const handlePopState = () => {
      if (!isHomeRef.current) return;

      if (backPressedOnce.current) {
        clearTimeout(resetTimer.current);
        if (window.navigator?.app?.exitApp) {
          window.navigator.app.exitApp();
        } else {
          try { window.close(); } catch (_) {}
        }
        return;
      }

      // First back press on Home — push a new entry so the WebView
      // doesn't exit, and show the confirmation toast.
      window.history.pushState(null, '');
      backPressedOnce.current = true;
      toast(getExitMessage(), { duration: 2000 });

      resetTimer.current = setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(resetTimer.current);
      backPressedOnce.current = false;
    };
  }, []);
}