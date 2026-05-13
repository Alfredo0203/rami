import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/shop/PullToRefresh';
import ProductCard from '../components/shop/ProductCard';
import BottomNav from '../components/shop/BottomNav';
import SearchHeaderWithHistory from '../components/shop/SearchHeaderWithHistory';
import { SlidersHorizontal, X, Loader2, Star, Tag, Package, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import RecommendationsModal from '../components/shop/RecommendationsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useScrollRestoration } from '../components/useScrollRestoration';
import { useTranslation } from '../components/i18n/useTranslation';

export default function Browse() {
  useScrollRestoration();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(null); // null = random order
  const [priceRange, setPriceRange] = useState([0, 100]);

  // Read ?category= from URL on mount
  const urlParams = new URLSearchParams(window.location.search);
  const [selectedCategory, setSelectedCategory] = useState(urlParams.get('category') || 'all');

  // Re-sync if URL changes (e.g., after navigating from search)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) setSelectedCategory(cat);
  }, [window.location.search]);
  const [minRating, setMinRating] = useState(0);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedVariantFilters, setSelectedVariantFilters] = useState({}); // { "Talla": "M", ... }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => base44.functions.invoke('getPublicCatalog', {}).then(r => r.data),
  });

  const products = useMemo(() => (catalogData?.products || []).filter(p => p.is_active), [catalogData]);
  const categories = catalogData?.categories || [];

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list().catch(() => []),
  });

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100;
    const max = Math.max(...products.map(p => p.price || 0));
    return Math.ceil(max / 10) * 10;
  }, [products]);

  // Reset price range upper bound when maxPrice is known
  const [priceRangeInitialized, setPriceRangeInitialized] = useState(false);
  useEffect(() => {
    if (!priceRangeInitialized && products.length > 0) {
      setPriceRange([0, maxPrice]);
      setPriceRangeInitialized(true);
    }
  }, [maxPrice, products.length, priceRangeInitialized]);

  const availableBrands = useMemo(() => {
    return [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  }, [products]);

  // Colors: merge product.color + variant_attributes["Color"] / "color"
  const availableColors = useMemo(() => {
    const s = new Set();
    products.forEach(p => {
      if (p.color) s.add(p.color);
      const varColors =
        p.variant_attributes?.['Color'] ||
        p.variant_attributes?.['color'] ||
        p.variant_attributes?.['COLOR'] || [];
      varColors.forEach(c => s.add(c));
    });
    return [...s].sort();
  }, [products]);

  // Variant attribute keys other than color (e.g. Talla, Material)
  const availableVariantKeys = useMemo(() => {
    const keySet = new Set();
    products.forEach(p => {
      if (p.variant_attributes) {
        Object.keys(p.variant_attributes).forEach(k => {
          const lower = k.toLowerCase();
          if (lower !== 'color') keySet.add(k);
        });
      }
    });
    return Array.from(keySet);
  }, [products]);

  const variantFilterOptions = useMemo(() => {
    const result = {};
    availableVariantKeys.forEach(key => {
      const s = new Set();
      products.forEach(p => {
        (p.variant_attributes?.[key] || []).forEach(v => s.add(v));
      });
      result[key] = [...s].sort();
    });
    return result;
  }, [products, availableVariantKeys]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    if (onlyOnSale) {
      filtered = filtered.filter(p => p.original_price && p.original_price > p.price);
    }

    if (onlyInStock) {
      // Usa effective_stock (calculado en backend): suma variantes si has_variants, o stock base
      filtered = filtered.filter(p => (p.effective_stock ?? p.stock ?? 0) > 0);
    }

    if (selectedBrand !== 'all') {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    if (selectedColor !== 'all') {
      filtered = filtered.filter(p => {
        if (p.color === selectedColor) return true;
        const varColors =
          p.variant_attributes?.['Color'] ||
          p.variant_attributes?.['color'] ||
          p.variant_attributes?.['COLOR'] || [];
        return varColors.includes(selectedColor);
      });
    }

    // Filter by variant attributes (e.g. Talla)
    Object.entries(selectedVariantFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(p =>
          (p.variant_attributes?.[key] || []).includes(value)
        );
      }
    });

    if (minRating > 0) {
      filtered = filtered.filter(p => (p.rating || 0) >= minRating);
    }

    // Apply sorting if specified
    if (sortBy === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === 'price_low') filtered = [...filtered].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_high') filtered = [...filtered].sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'popular') filtered = [...filtered].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));

    return filtered;
  }, [products, searchQuery, selectedCategory, priceRange, sortBy, onlyOnSale, onlyInStock, minRating, selectedBrand, selectedColor, selectedVariantFilters]);

  const queryClient = useQueryClient();
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedBrand !== 'all',
    selectedColor !== 'all',
    onlyOnSale,
    onlyInStock,
    minRating > 0,
    priceRange[0] > 0 || priceRange[1] < maxPrice,
    Object.values(selectedVariantFilters).some(v => v && v !== 'all'),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedColor('all');
    setSelectedVariantFilters({});
    setOnlyOnSale(false);
    setOnlyInStock(false);
    setMinRating(0);
    setPriceRange([0, maxPrice]);
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SearchHeaderWithHistory 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        cartCount={cartCount}
      />

      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 overflow-visible">
        <div className="flex items-center gap-2 max-w-lg mx-auto pt-2 pb-2">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button className="relative p-1.5 bg-secondary rounded-full mt-1">
                <SlidersHorizontal className="w-4 h-4 text-foreground" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="flex flex-row items-center justify-between pr-8">
                <SheetTitle>Filtros</SheetTitle>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-primary font-medium">
                    Limpiar todo
                  </button>
                )}
              </SheetHeader>
              <div className="space-y-6 py-4">

                {/* Categoría */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                    >
                      Todas
                    </button>
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    Precio: <span className="text-primary">${priceRange[0]} – ${priceRange[1]}</span>
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={maxPrice}
                    step={5}
                  />
                </div>

                {/* Rating mínimo */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Rating mínimo</label>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5].map(r => (
                      <button
                        key={r}
                        onClick={() => setMinRating(r)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${minRating === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                      >
                        {r === 0 ? 'Todos' : <><Star className="w-3 h-3" />{r}+</>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marca */}
                {availableBrands.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Marca</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedBrand('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedBrand === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                      >
                        Todas
                      </button>
                      {availableBrands.map(b => (
                        <button
                          key={b}
                          onClick={() => setSelectedBrand(b)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedBrand === b ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color */}
                {availableColors.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedColor('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedColor === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                      >
                        Todos
                      </button>
                      {availableColors.map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedColor === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Otros atributos de variantes (Talla, Material, etc.) */}
                {availableVariantKeys.map(key => {
                  const options = variantFilterOptions[key] || [];
                  if (options.length === 0) return null;
                  const current = selectedVariantFilters[key] || 'all';
                  return (
                    <div key={key}>
                      <label className="text-sm font-semibold text-foreground mb-2 block">{key}</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedVariantFilters(prev => ({ ...prev, [key]: 'all' }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${current === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                        >
                          Todos
                        </button>
                        {options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSelectedVariantFilters(prev => ({ ...prev, [key]: opt }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${current === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-sale" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Solo en oferta</p>
                        <p className="text-xs text-muted-foreground">Productos con descuento</p>
                      </div>
                    </div>
                    <Switch checked={onlyOnSale} onCheckedChange={setOnlyOnSale} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-success" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Solo en stock</p>
                        <p className="text-xs text-muted-foreground">Productos disponibles</p>
                      </div>
                    </div>
                    <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} />
                  </div>
                </div>

                <Button onClick={() => setFiltersOpen(false)} className="w-full bg-primary text-primary-foreground rounded-full">
                  Ver {filteredProducts.length} productos
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('products_count', { count: filteredProducts.length })}</p>
        <Select value={sortBy ?? ''} onValueChange={(val) => setSortBy(val === '' ? null : val)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Sin ordenar</SelectItem>
            <SelectItem value="newest">{t('sort_newest')}</SelectItem>
            <SelectItem value="price_low">{t('sort_price_low')}</SelectItem>
            <SelectItem value="price_high">{t('sort_price_high')}</SelectItem>
            <SelectItem value="rating">{t('sort_rating')}</SelectItem>
            <SelectItem value="popular">{t('sort_popular')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-3">
          {isLoading ? (
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

      {/* Floating AI recommendations button */}
      <button
        onClick={() => setRecOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium active:scale-95 transition-transform"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      <RecommendationsModal open={recOpen} onClose={() => setRecOpen(false)} />

      <BottomNav cartCount={cartCount} />
    </div>
  );
}