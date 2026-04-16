import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ShoppingCart, X, Clock, TrendingUp, Tag, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SearchHeaderWithHistory({ searchQuery, setSearchQuery, cartCount = 0, onSearch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch search history
  const { data: history = [] } = useQuery({
    queryKey: ['search-history'],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        return await base44.entities.SearchHistory.filter({ user_email: user.email }, '-updated_date', 10);
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
  });

  // Fetch products and categories for suggestions
  const { data: catalogData = { products: [], categories: [] } } = useQuery({
    queryKey: ['products-for-search'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getPublicCatalog', {});
        return {
          products: res.data?.products || [],
          categories: res.data?.categories || [],
        };
      } catch {
        return { products: [], categories: [] };
      }
    },
  });

  const products = catalogData.products;
  const categories = catalogData.categories;

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (query) => {
      if (!user?.email || !query.trim()) return;
      
      const existing = await base44.entities.SearchHistory.filter({
        user_email: user.email,
        query: query.trim(),
      });

      if (existing.length > 0) {
        // Update count
        await base44.entities.SearchHistory.update(existing[0].id, {
          search_count: (existing[0].search_count || 1) + 1,
        });
      } else {
        // Create new
        await base44.entities.SearchHistory.create({
          user_email: user.email,
          query: query.trim(),
          search_count: 1,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });

  // Get popular searches (most searched)
  const popularSearches = useMemo(() => {
    return history
      .sort((a, b) => (b.search_count || 0) - (a.search_count || 0))
      .slice(0, 3)
      .map(h => ({
        id: h.id,
        text: h.query,
        type: 'popular',
        icon: Zap,
        count: h.search_count,
      }));
  }, [history]);

  // Get all tags from products
  const allTags = useMemo(() => {
    const tags = new Set();
    products.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).slice(0, 5);
  }, [products]);

  // Get suggestions based on input
  const getSuggestions = () => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      // Show recent searches + popular when input is empty
      const recent = history
        .slice(0, 3)
        .map(h => ({
          id: h.id,
          text: h.query,
          type: 'history',
          icon: Clock,
        }));

      const popular = popularSearches.slice(0, 2);

      return [...recent, ...popular];
    }

    // Get matching products
    const productSuggestions = products
      .filter(p => p.name.toLowerCase().includes(query) || 
                    p.description?.toLowerCase().includes(query))
      .slice(0, 4)
      .map(p => ({
        id: p.id,
        text: p.name,
        type: 'product',
        icon: TrendingUp,
        subtitle: p.price ? `$${p.price}` : undefined,
      }));

    // Get matching categories
    const categorySuggestions = categories
      .filter(c => c.name.toLowerCase().includes(query))
      .slice(0, 2)
      .map(c => ({
        id: c.id,
        text: c.name,
        type: 'category',
        icon: Tag,
      }));

    // Get matching history
    const historySuggestions = history
      .filter(h => h.query.toLowerCase().includes(query))
      .slice(0, 2)
      .map(h => ({
        id: h.id,
        text: h.query,
        type: 'history',
        icon: Clock,
      }));

    // Get matching tags
    const tagSuggestions = allTags
      .filter(tag => tag.toLowerCase().includes(query))
      .slice(0, 2)
      .map(tag => ({
        id: tag,
        text: tag,
        type: 'tag',
        icon: Tag,
      }));

    return [...productSuggestions, ...categorySuggestions, ...historySuggestions, ...tagSuggestions];
  };

  const suggestions = getSuggestions();

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsOpen(false);
    saveSearchMutation.mutate(query);
    onSearch?.(query);
  };

  const handleDeleteHistory = (id) => {
    base44.entities.SearchHistory.delete(id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    }).catch(() => {
      // silently fail
    });
  };

  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery);
              }
            }}
            placeholder="Buscar productos..."
            className="w-full bg-secondary rounded-full pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />

          {/* Dropdown de sugerencias */}
          {isOpen && (suggestions.length > 0 || searchQuery.trim()) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
              {suggestions.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => {
                    const Icon = suggestion.icon;
                    const typeLabel = {
                      history: 'Reciente',
                      product: 'Producto',
                      category: 'Categoría',
                      tag: 'Etiqueta',
                      popular: 'Popular',
                    }[suggestion.type];

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSearch(suggestion.text)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left border-b border-border/50 last:border-0 group"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground block truncate">{suggestion.text}</span>
                          {suggestion.subtitle && (
                            <span className="text-xs text-muted-foreground">{suggestion.subtitle}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{typeLabel}</span>
                        {suggestion.type === 'history' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistory(suggestion.id);
                            }}
                            className="p-1 hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {searchQuery.trim() && suggestions.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay resultados para "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* Click fuera para cerrar */}
          {isOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>

        <Link to="/Cart" className="relative p-2.5 bg-secondary rounded-full">
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