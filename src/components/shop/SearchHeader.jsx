import React from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SearchHeader({ searchQuery, setSearchQuery, cartCount = 0 }) {
  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0] || {}),
    staleTime: 60_000,
  });

  const storeName = settings?.store_name || '';
  const logoUrl = settings?.logo_url || '';

  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {/* Logo / store name */}
        {(logoUrl || storeName) && (
          <div className="flex items-center gap-2 shrink-0">
            {logoUrl && (
              <img src={logoUrl} alt={storeName || 'Logo'} className="h-7 w-auto object-contain" />
            )}
            {storeName && !logoUrl && (
              <span className="text-sm font-bold text-foreground leading-tight">{storeName}</span>
            )}
          </div>
        )}

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full bg-secondary rounded-full pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        <Link to={createPageUrl('Cart')} className="relative p-2.5 bg-secondary rounded-full">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}