import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, X, Clock, TrendingUp } from 'lucide-react';
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
    queryFn: () =>
      user?.email
        ? base44.entities.SearchHistory.filter({ user_email: user.email }, '-updated_date', 10)
        : [],
    enabled: !!user?.email,
  });

  // Fetch products for suggestions
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-search'],
    queryFn: () => base44.functions.invoke('getPublicCatalog', {}),
  });

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

  // Get suggestions based on input
  const getSuggestions = () => {
    if (!searchQuery.trim()) {
      // Show recent searches when input is empty
      return history.slice(0, 5).map(h => ({
        id: h.id,
        text: h.query,
        type: 'history',
        icon: Clock,
      }));
    }

    const query = searchQuery.toLowerCase();
    
    // Get matching products
    const productSuggestions = products
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        text: p.name,
        type: 'product',
        icon: TrendingUp,
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

    return [...productSuggestions, ...historySuggestions];
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              {suggestions.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSearch(suggestion.text)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-0"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{suggestion.text}</span>
                        {suggestion.type === 'history' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistory(suggestion.id);
                            }}
                            className="p-1 hover:bg-destructive/10 rounded-full"
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
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Sin resultados</p>
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