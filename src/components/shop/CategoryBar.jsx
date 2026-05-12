import React from 'react';
import { Shirt, Watch, Smartphone, Dumbbell, Sparkles, Gift, Palette, Tag, ShoppingBag, Star } from 'lucide-react';

const iconMap = {
  Shirt, Watch, Smartphone, Dumbbell, Sparkles, Gift, Palette, Tag, ShoppingBag, Star
};

// Home icon intentionally excluded — "Home" is only in the bottom nav
const defaultIcons = [Shirt, Watch, Smartphone, Dumbbell, Sparkles, Gift, Palette, Tag, ShoppingBag, Star];

export default function CategoryBar({ categories, selectedId, onSelect }) {
  // Filter out any category literally named "Home" to avoid duplication with the bottom nav
  const filteredCategories = (categories || []).filter(
    cat => cat.name?.toLowerCase() !== 'home'
  );

  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar py-3 px-4">
      {/* "All" button */}
      <button
        onClick={() => onSelect(null)}
        className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
          !selectedId && selectedId !== 'featured' ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          !selectedId && selectedId !== 'featured' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-secondary-foreground'
        }`}>
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-foreground">All</span>
      </button>

      {/* "Destacados" button */}
      <button
        onClick={() => onSelect('featured')}
        className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
          selectedId === 'featured' ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          selectedId === 'featured' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-secondary-foreground'
        }`}>
          <Star className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-foreground">Destacados</span>
      </button>

      {filteredCategories.map((cat, i) => {
        const Icon = iconMap[cat.icon] || defaultIcons[i % defaultIcons.length];
        const isActive = selectedId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
              isActive ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-secondary-foreground'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-foreground truncate max-w-[56px]">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}