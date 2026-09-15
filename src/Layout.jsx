import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import DevModeGuard from './components/DevModeGuard';

const TAB_PAGES = ['Home', 'Browse', 'Orders', 'Account'];
let prevTabIdx = 0;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navType = useNavigationType();
  const isHome = location.pathname === '/';

  // Back-to-exit on Home: push a sentinel entry so the native back button
  // fires popstate. When the sentinel is popped (user pressed back on Home),
  // go back one more step to let the WebView's native handler exit the app.
  useEffect(() => {
    if (!isHome) return;
    if (window.history.state?.exitSentinel) return;

    window.history.pushState({ exitSentinel: true }, '');

    const handlePopState = () => {
      if (window.location.pathname === '/' && !window.history.state?.exitSentinel) {
        window.history.go(-1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHome]);

  const tabIdx = TAB_PAGES.indexOf(currentPageName);
  const isTab = tabIdx >= 0;

  let dir = 1;
  if (navType === 'POP') {
    dir = -1;
  } else if (isTab) {
    dir = tabIdx >= prevTabIdx ? 1 : -1;
    prevTabIdx = tabIdx;
  }

  return (
    <div style={{ overflowX: 'clip' }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={location.pathname + location.search}
          custom={dir}
          variants={{
            initial: (d) => ({ x: `${d * 100}%`, opacity: 0 }),
            animate: { x: 0, opacity: 1 },
            exit: (d) => ({ x: `${d * -30}%`, opacity: 0 }),
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <DevModeGuard>
            {children}
          </DevModeGuard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}