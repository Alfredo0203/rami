import React from 'react';
import DevModeGuard from './components/DevModeGuard';

export default function Layout({ children }) {
  return (
    <div style={{ overflowX: 'clip' }}>
      <DevModeGuard>
        {children}
      </DevModeGuard>
    </div>
  );
}