import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/shop/PullToRefresh';
import SearchHeaderWithHistory from '../components/shop/SearchHeaderWithHistory';
import CategoryBar from '../components/shop/CategoryBar';
import PromoBanner from '../components/shop/PromoBanner';
import ProductCard from '../components/shop/ProductCard';
import BottomNav from '../components/shop/BottomNav';
import InfiniteScroll from '../components/shop/InfiniteScroll';
import { productMatchesCategory } from '@/lib/productCategories';
import { productMatchScore } from '@/lib/search';
import { stableShuffle } from '@/lib/stableOrder';

import { useTranslation } from '../components/i18n/useTranslation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { localLogout } from '@/lib/authRedirect';
import { useScrollRestoration } from '../components/useScrollRestoration';

export default function Home() {
  useScrollRestoration();
  const { t } = useTranslation();
  // La búsqueda y la categoría viven en la URL: al volver del detalle de un
  // producto la lista se restaura tal como la dejó el usuario.
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => new URLSearchParams(window.location.search).get('cat') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userCheckDone, setUserCheckDone] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(() => {
    const saved = Number(sessionStorage.getItem('home-displayed-count'));
    return saved >= 12 ? saved : 12;
  });
  const filtersInitialized = useRef(false);
  const ITEMS_PER_LOAD = 8;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchQuery) params.set('q', searchQuery); else params.delete('q');
    if (selectedCategory) params.set('cat', selectedCategory); else params.delete('cat');
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    sessionStorage.setItem('home-displayed-count', String(displayedCount));
  }, [displayedCount]);

  useEffect(() => {
    base44.auth.me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setUserCheckDone(true));
  }, []);

  const { data: catalogData, isLoading: loadingProducts } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog', {}).then(r => r.data),
  });

  const products = catalogData?.products ?? [];
  const categories = catalogData?.categories ?? [];

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: () => base44.entities.CartItem.filter({ created_by: currentUser.email }),
    enabled: !!currentUser && userCheckDone,
  });

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.is_active !== false);
    
    // Filter by featured if selected
    if (selectedCategory === 'featured') {
      filtered = filtered.filter(p => p.is_featured);
    } else if (selectedCategory) {
      filtered = filtered.filter(p => productMatchesCategory(p, selectedCategory));
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => productMatchScore(p, searchQuery) > 0);
    }
    
    // Orden aleatorio pero estable: no cambia al regresar de un producto.
    return stableShuffle(filtered, 'home');
  }, [products, selectedCategory, searchQuery]);

  // Al cambiar los filtros se vuelve al inicio de la lista (no al montar,
  // porque ahí hay que respetar lo que el usuario ya tenía).
  useEffect(() => {
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    setDisplayedCount(12);
  }, [searchQuery, selectedCategory]);

  const displayedProducts = filteredProducts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredProducts.length;

  const queryClient = useQueryClient();
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
    setDisplayedCount(12);
  }, [queryClient]);

  const handleLoadMore = useCallback(() => {
    setDisplayedCount(prev => prev + ITEMS_PER_LOAD);
  }, []);

  const userStatus = currentUser?.status || 'active';
  const [requestingReactivation, setRequestingReactivation] = useState(false);

  const handleRequestReactivation = async () => {
    try {
      setRequestingReactivation(true);
      await base44.functions.invoke('requestAccountReactivation', {});
      toast.success('Email de reactivación enviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Error al solicitar reactivación';
      toast.error(errorMsg);
    } finally {
      setRequestingReactivation(false);
    }
  };

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
        {userStatus === 'deactivated' && (
          <Button
            onClick={handleRequestReactivation}
            disabled={requestingReactivation}
            className="mt-4 bg-destructive hover:bg-destructive/90 text-white"
          >
            {requestingReactivation && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Solicitar reactivación
          </Button>
        )}
        <button
          onClick={() => localLogout('/')}
          className="mt-2 text-sm text-destructive underline"
        >
          {t('sign_out')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SearchHeaderWithHistory
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartCount}
        onSearch={setSearchQuery}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-6xl mx-auto">
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
                <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-sm">{t('no_products')}</p>
              </div>
            ) : (
              <InfiniteScroll
                items={displayedProducts}
                renderItem={(product, i) => <ProductCard product={product} index={i} />}
                onLoadMore={handleLoadMore}
                isLoading={false}
                hasMore={hasMore}
              />
            )}
          </div>
        </div>
      </PullToRefresh>

      <BottomNav cartCount={cartCount} />

    </div>
  );
}