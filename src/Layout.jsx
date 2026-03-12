import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';

const TAB_PAGES = ['Home', 'Browse', 'Orders', 'Account'];
let prevTabIdx = 0;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navType = useNavigationType();

  const tabIdx = TAB_PAGES.indexOf(currentPageName);
  const isTab = tabIdx >= 0;

  // 1 = new page enters from right, -1 = from left
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
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}