import React from 'react';
import { X, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Selección múltiple de categorías. La primera marcada con ★ es la principal.
export default function CategoryMultiSelect({ categories = [], value = [], onChange, placeholder = 'Seleccionar' }) {
  const selected = value
    .map(id => categories.find(c => c.id === id))
    .filter(Boolean);
  const available = categories.filter(c => !value.includes(c.id));

  return (
    <div className="space-y-1.5 mt-1">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((cat, idx) => (
            <span
              key={cat.id}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${
                idx === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground border border-border'
              }`}
            >
              {idx === 0 && <Star className="w-3 h-3 fill-current" />}
              {cat.name}
              <button
                type="button"
                onClick={() => onChange(value.filter(id => id !== cat.id))}
                className="flex items-center justify-center hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Select value="" onValueChange={(v) => { if (v) onChange([...value, v]); }}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={selected.length ? 'Agregar otra categoría' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {available.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}