import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

export default function BottomNav({ cartCount = 0 }) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { icon: Home, label: t('nav_home'), page: 'Home' },
    { icon: Search, label: t('nav_browse'), page: 'Browse' },
    { icon: ShoppingBag, label: t('nav_orders'), page: 'Orders' },
    { icon: User, label: t('nav_account'), page: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1.5">
        {navItems.map(({ icon: Icon, label, page }) => {
          const url = createPageUrl(page);
          const isActive = currentPath === url || (page === 'Home' && currentPath === '/');
          return (
            <Link
              key={page}
              to={url}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}