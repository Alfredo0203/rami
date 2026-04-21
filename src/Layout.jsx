import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import DevModeGuard from './components/DevModeGuard';
import RecommendationsModal from './components/shop/RecommendationsModal';
import { Sparkles } from 'lucide-react';

const TAB_PAGES = ['Home', 'Browse', 'Orders', 'Account'];
// Pages where we DON'T show the floating button (Browse has its own)
const EXCLUDED_PAGES = ['Browse', 'Recommendations'];
let prevTabIdx = 0;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navType = useNavigationType();
  const [recOpen, setRecOpen] = useState(false);

  const tabIdx = TAB_PAGES.indexOf(currentPageName);
  const isTab = tabIdx >= 0;

  let dir = 1;
  if (navType === 'POP') {
    dir = -1;
  } else if (isTab) {
    dir = tabIdx >= prevTabIdx ? 1 : -1;
    prevTabIdx = tabIdx;
  }

  const showFab = !EXCLUDED_PAGES.includes(currentPageName);

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

      {showFab && (
        <button
          onClick={() => setRecOpen(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium active:scale-95 transition-transform"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}

      <RecommendationsModal open={recOpen} onClose={() => setRecOpen(false)} />
    </div>
  );
}