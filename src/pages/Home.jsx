import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/shop/PullToRefresh';
import SearchHeader from '../components/shop/SearchHeader';
import CategoryBar from '../components/shop/CategoryBar';
import PromoBanner from '../components/shop/PromoBanner';
import ProductCard from '../components/shop/ProductCard';
import BottomNav from '../components/shop/BottomNav';
import { useBackExitConfirm } from '../components/useBackExitConfirm';
import { useTranslation } from '../components/i18n/useTranslation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useScrollRestoration } from '../components/useScrollRestoration';

export default function Home() {
  useScrollRestoration();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  useBackExitConfirm();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: catalogData, isLoading: loadingProducts } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog', {}).then(r => r.data),
  });

  const products = catalogData?.products ?? [];
  const categories = catalogData?.categories ?? [];

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email ?? 'guest'],
    queryFn: () => !currentUser?.email ? [] : base44.entities.CartItem.filter({ created_by: currentUser.email }).catch(() => []),
    retry: false,
  });

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.is_active !== false);
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const queryClient = useQueryClient();
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  const userStatus = currentUser?.status || 'active';

  if (userStatus === 'suspended' || userStatus === 'deactivated') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-foreground">
          {t(userStatus === 'suspended' ? 'account_suspended' : 'account_deactivated')}
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          {currentUser?.status_reason || t('account_restricted')}
        </p>
        <button
          onClick={() => base44.auth.logout()}
          className="mt-2 text-sm text-destructive underline"
        >
          {t('sign_out')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartCount}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <PromoBanner />

        <CategoryBar
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="px-3">
          {searchQuery && (
            <p className="text-xs text-muted-foreground mb-2 px-1">
              {t('search_results', { count: filteredProducts.length, query: searchQuery })}
            </p>
          )}

          {loadingProducts ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">{t('no_products')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNav cartCount={cartCount} />

    </div>
  );
}