import React from 'react';
import { Plus } from 'lucide-react';

// Chips con valores ya usados en el catálogo para este tipo de atributo.
export default function AttrValueSuggestions({ suggestions, onPick }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        Ya usados en otros productos — toca para agregar:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/40 text-[11px] text-primary bg-primary/5 hover:bg-primary/15 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}