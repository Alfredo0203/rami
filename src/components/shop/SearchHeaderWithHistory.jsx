import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, ShoppingCart, X, Clock, TrendingUp, Tag,
  Zap, ArrowRight, Store, ChevronRight, Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Scoring helper: prioritize exact > starts-with > includes
function scoreMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 3;
  if (t.startsWith(q)) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

export default function SearchHeaderWithHistory({ searchQuery, setSearchQuery, cartCount = 0, onSearch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [user, setUser] = useState(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Keep inputValue in sync if parent resets it
  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  // Get current user (guests allowed)
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch search history (user-specific)
  const { data: history = [] } = useQuery({
    queryKey: ['search-history', user?.email],
    queryFn: () =>
      base44.entities.SearchHistory.filter({ user_email: user.email }, '-updated_date', 20),
    enabled: !!user?.email,
  });

  // Fetch catalog (products + categories)
  const { data: catalogData = { products: [], categories: [] } } = useQuery({
    queryKey: ['products-for-search'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPublicCatalog', {});
      return {
        products: res.data?.products || [],
        categories: res.data?.categories || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const products = catalogData.products;
  const categories = catalogData.categories;

  // Derived: recent history (last 5)
  const recentHistory = useMemo(() =>
    [...history].sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0)).slice(0, 5),
    [history]
  );

  // Derived: popular searches (top by count from all users' perspective = top of current user)
  const popularSearches = useMemo(() =>
    [...history].sort((a, b) => (b.search_count || 0) - (a.search_count || 0)).slice(0, 5),
    [history]
  );

  // Derived: featured categories (top 6)
  const featuredCategories = useMemo(() => categories.slice(0, 6), [categories]);

  // Derived: all brands
  const allBrands = useMemo(() => {
    const s = new Set();
    products.forEach(p => { if (p.brand) s.add(p.brand); });
    return Array.from(s);
  }, [products]);

  // --- Save / Delete search history ---
  const saveSearch = async (query) => {
    if (!user?.email || !query.trim()) return;
    const q = query.trim();
    const existing = history.find(h => h.query.toLowerCase() === q.toLowerCase());
    if (existing) {
      await base44.entities.SearchHistory.update(existing.id, {
        search_count: (existing.search_count || 1) + 1,
        updated_date: new Date().toISOString(),
      });
    } else {
      await base44.entities.SearchHistory.create({ user_email: user.email, query: q, search_count: 1 });
    }
    queryClient.invalidateQueries({ queryKey: ['search-history', user?.email] });
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    await base44.entities.SearchHistory.delete(id);
    queryClient.invalidateQueries({ queryKey: ['search-history', user?.email] });
  };

  const clearAllHistory = async () => {
    await Promise.all(history.map(h => base44.entities.SearchHistory.delete(h.id)));
    queryClient.invalidateQueries({ queryKey: ['search-history', user?.email] });
  };

  // --- Execute a search ---
  const executeSearch = (query) => {
    const q = query.trim();
    if (!q) return;
    setInputValue(q);
    setSearchQuery(q);
    setIsOpen(false);
    saveSearch(q);
    onSearch?.(q);
  };

  // --- Navigate directly to product ---
  const goToProduct = (productId) => {
    setIsOpen(false);
    navigate(`/ProductDetail?id=${productId}`);
  };

  // --- Filter by category (set search to category name, close panel) ---
  const filterByCategory = (category) => {
    setInputValue('');
    setSearchQuery('');
    setIsOpen(false);
    onSearch?.('');
    // pass category selection up — Browse will handle it via URL or callback
    navigate(`/Browse?category=${category.id}`);
  };

  // --- Suggestions while typing (smart relevance scoring) ---
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return [];

    const items = [];

    // History matches
    recentHistory.forEach(h => {
      const score = scoreMatch(h.query, q);
      if (score > 0) items.push({ type: 'history', text: h.query, id: h.id, score: score + 5 });
    });

    // Category matches
    categories.forEach(c => {
      const score = scoreMatch(c.name, q);
      if (score > 0) items.push({ type: 'category', text: c.name, id: c.id, score: score + 3 });
    });

    // Brand matches
    allBrands.forEach(b => {
      const score = scoreMatch(b, q);
      if (score > 0) items.push({ type: 'brand', text: b, id: b, score: score + 2 });
    });

    // Product matches (name)
    products.forEach(p => {
      const nameScore = scoreMatch(p.name, q);
      const tagScore = p.tags?.some(t => t.toLowerCase().includes(q)) ? 1 : 0;
      const score = Math.max(nameScore, tagScore);
      if (score > 0) {
        items.push({
          type: 'product',
          text: p.name,
          id: p.id,
          score,
          subtitle: p.price ? `$${Number(p.price).toFixed(2)}` : null,
          image: p.images?.[0] || null,
          soldCount: p.sold_count || 0,
        });
      }
    });

    // Sort by score desc, then by sold_count for products
    items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.soldCount || 0) - (a.soldCount || 0);
    });

    // Deduplicate by text+type
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.type}:${item.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [inputValue, recentHistory, categories, allBrands, products]);

  // --- No-results: suggest similar products ---
  const noResultSuggestions = useMemo(() => {
    if (inputValue.trim() && suggestions.length === 0) {
      return products
        .filter(p => p.is_featured || (p.sold_count || 0) > 0)
        .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
        .slice(0, 4);
    }
    return [];
  }, [inputValue, suggestions, products]);

  const isTyping = inputValue.trim().length > 0;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top" ref={panelRef}>
      {/* Search bar row */}
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') executeSearch(inputValue);
              if (e.key === 'Escape') setIsOpen(false);
            }}
            placeholder="Buscar productos, marcas, categorías..."
            className="w-full bg-secondary rounded-full pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); setSearchQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {/* ── SEARCH PANEL ── */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">

              {/* == TYPING: show smart suggestions == */}
              {isTyping && suggestions.length > 0 && (
                <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/40">
                  {suggestions.map((s, i) => (
                    <SuggestionRow
                      key={`${s.type}-${s.id}-${i}`}
                      suggestion={s}
                      query={inputValue}
                      onSelect={() => {
                        if (s.type === 'product') goToProduct(s.id);
                        else executeSearch(s.text);
                      }}
                      onDelete={s.type === 'history' ? (e) => deleteHistoryItem(e, s.id) : null}
                    />
                  ))}
                </div>
              )}

              {/* == TYPING: no results == */}
              {isTyping && suggestions.length === 0 && (
                <div className="p-5">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Sin resultados para <strong>"{inputValue}"</strong>
                  </p>
                  {noResultSuggestions.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground mb-3">Puede que te interese:</p>
                      <div className="space-y-2">
                        {noResultSuggestions.map(p => (
                          <button
                            key={p.id}
                            onClick={() => goToProduct(p.id)}
                            className="w-full flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-secondary transition-colors text-left"
                          >
                            {p.images?.[0] ? (
                              <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                <Store className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                              <p className="text-xs text-primary">${Number(p.price).toFixed(2)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* == IDLE: historial + populares + categorías == */}
              {!isTyping && (
                <div className="max-h-[75vh] overflow-y-auto">

                  {/* Historial reciente */}
                  {recentHistory.length > 0 && (
                    <section className="p-4 border-b border-border/40">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recientes</span>
                        <button
                          onClick={clearAllHistory}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Limpiar
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentHistory.map(h => (
                          <button
                            key={h.id}
                            onClick={() => executeSearch(h.query)}
                            className="w-full flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-secondary transition-colors text-left group"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 text-sm text-foreground truncate">{h.query}</span>
                            <span
                              onClick={(e) => deleteHistoryItem(e, h.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-destructive/10 transition-all"
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Búsquedas populares */}
                  {popularSearches.length > 0 && (
                    <section className="p-4 border-b border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Populares</p>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((h, i) => (
                          <button
                            key={h.id}
                            onClick={() => executeSearch(h.query)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-primary/10 hover:text-primary border border-border/60 rounded-full text-sm transition-colors"
                          >
                            <Zap className="w-3 h-3 text-primary" />
                            {h.query}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Categorías destacadas */}
                  {featuredCategories.length > 0 && (
                    <section className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Categorías</p>
                      <div className="grid grid-cols-3 gap-2">
                        {featuredCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => filterByCategory(cat)}
                            className="flex flex-col items-center gap-1.5 p-3 bg-secondary/60 hover:bg-primary/10 border border-border/40 rounded-xl transition-colors group"
                          >
                            {cat.image_url ? (
                              <img src={cat.image_url} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <Tag className="w-5 h-5 text-primary" />
                            )}
                            <span className="text-xs text-foreground font-medium text-center leading-tight line-clamp-2">
                              {cat.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Estado vacío total */}
                  {recentHistory.length === 0 && popularSearches.length === 0 && featuredCategories.length === 0 && (
                    <div className="p-8 text-center">
                      <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Escribe para buscar productos</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart icon */}
        <Link to="/Cart" className="relative p-2.5 bg-secondary rounded-full flex-shrink-0">
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

// ── Sub-component: a single suggestion row ──
function SuggestionRow({ suggestion, query, onSelect, onDelete }) {
  const { type, text, subtitle, image } = suggestion;

  const typeConfig = {
    history:  { icon: Clock,        label: 'Reciente',   color: 'text-muted-foreground' },
    product:  { icon: Store,        label: 'Producto',   color: 'text-blue-500' },
    category: { icon: Tag,          label: 'Categoría',  color: 'text-primary' },
    brand:    { icon: TrendingUp,   label: 'Marca',      color: 'text-amber-500' },
    tag:      { icon: Tag,          label: 'Etiqueta',   color: 'text-primary' },
  }[type] || { icon: Search, label: '', color: 'text-muted-foreground' };

  const Icon = typeConfig.icon;

  // Highlight matching part of text
  const renderHighlighted = (text, query) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1 || !query) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left group"
    >
      {type === 'product' && image ? (
        <img src={image} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border/40" />
      ) : (
        <div className={`w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {renderHighlighted(text, query)}
        </p>
        {subtitle && <p className="text-xs text-primary mt-0.5">{subtitle}</p>}
      </div>

      <span className="text-[10px] text-muted-foreground whitespace-nowrap px-2 py-0.5 bg-secondary rounded-full">
        {typeConfig.label}
      </span>

      {onDelete ? (
        <span
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded-full hover:bg-destructive/10 transition-all"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </span>
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-1" />
      )}
    </button>
  );
}