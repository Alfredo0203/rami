import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const positions = {};

export function useScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    const saved = positions[pathname];
    if (saved !== undefined) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    } else {
      window.scrollTo(0, 0);
    }
    return () => {
      positions[pathname] = window.scrollY;
    };
  }, [pathname]);
}