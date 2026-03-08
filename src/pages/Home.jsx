import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SearchHeader from '../components/shop/SearchHeader';
import CategoryBar from '../components/shop/CategoryBar';
import PromoBanner from '../components/shop/PromoBanner';
import ProductCard from '../components/shop/ProductCard';
import BottomNav from '../components/shop/BottomNav';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} cartCount={cartCount} />

      <PromoBanner />

      <CategoryBar
        categories={categories}
        selectedId={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="px-3">
        {searchQuery && (
          <p className="text-xs text-muted-foreground mb-2 px-1">
            {filteredProducts.length} results for "{searchQuery}"
          </p>
        )}

        {loadingProducts ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>

      <BottomNav cartCount={cartCount} />
    </div>
  );
}