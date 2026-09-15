import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const HOME_PATH = createPageUrl('Home');

// Detects browser language for toast message
function getExitMessage() {
  const lang = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  if (lang.startsWith('es')) return 'Presiona atrás de nuevo para salir';
  if (lang.startsWith('pt')) return 'Pressione voltar novamente para sair';
  return 'Press back again to exit';
}

export function useBackExitConfirm() {
  const location = useLocation();
  const isHome = location.pathname === HOME_PATH || location.pathname === '/';
  const backPressedOnce = useRef(false);
  const resetTimer = useRef(null);

  useEffect(() => {
    if (!isHome) return;

    // Push sentinel so first back gives us a popstate event
    window.history.pushState({ exitGuard: true }, '');

    const handlePopState = () => {
      if (backPressedOnce.current) {
        // Second press within 2s — exit
        clearTimeout(resetTimer.current);
        if (window.navigator?.app?.exitApp) {
          window.navigator.app.exitApp();
        } else {
          try { window.close(); } catch (_) {}
          setTimeout(() => { window.location.href = 'about:blank'; }, 100);
        }
        return;
      }

      // First press — show toast and re-push sentinel
      backPressedOnce.current = true;
      window.history.pushState({ exitGuard: true }, '');
      toast(getExitMessage(), { duration: 2000 });

      // Reset after 2s
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
  }, [isHome]);
}