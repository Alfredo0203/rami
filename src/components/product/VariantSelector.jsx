import React from 'react';

/**
 * Renders all variant option groups (Color, Talla, etc.) for a product.
 * Props:
 *   variantOptions: [{name, values}]
 *   selectedOptions: {optionName: value}
 *   variants: ProductVariant[]  — used to compute availability
 *   onSelect: (optionName, value) => void
 *   colorImages: {colorValue: [urls]}  — for color swatches
 */
export default function VariantSelector({ variantOptions = [], selectedOptions = {}, variants = [], onSelect, colorImages = {} }) {
  if (!variantOptions.length) return null;

  const isValueAvailable = (optionName, value) => {
    // Build a hypothetical selection with this value locked in
    const hypo = { ...selectedOptions, [optionName]: value };
    // Check if any active variant matches all currently selected options + this value
    return variants.some(v => {
      if (!v.is_active && v.is_active !== undefined) return false;
      return Object.entries(hypo).every(([k, val]) => {
        // Only constrain by fully selected options AND the option we're testing
        if (k !== optionName && !selectedOptions[k]) return true;
        return v.combination?.[k] === val;
      });
    });
  };

  const isOutOfStock = (optionName, value) => {
    const hypo = { ...selectedOptions, [optionName]: value };
    const matches = variants.filter(v =>
      Object.entries(hypo).every(([k, val]) => v.combination?.[k] === val)
    );
    if (!matches.length) return false; // not applicable yet
    return matches.every(v => (v.stock || 0) === 0);
  };

  return (
    <div className="space-y-4">
      {variantOptions.map(({ name, values }) => {
        const isColor = name.toLowerCase().includes('color');
        const selected = selectedOptions[name];

        return (
          <div key={name}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">{name}:</span>
              {selected && (
                <span className="text-sm text-muted-foreground">{selected}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const available = isValueAvailable(name, value);
                const oos = isOutOfStock(name, value);
                const isSelected = selected === value;

                if (isColor && colorImages[value]) {
                  // Color swatch with image thumbnail
                  return (
                    <button
                      key={value}
                      onClick={() => available && onSelect(name, value)}
                      disabled={!available}
                      title={value}
                      className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all
                        ${isSelected ? 'border-primary scale-105 shadow-md' : 'border-transparent'}
                        ${!available ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary/50'}
                      `}
                    >
                      <img src={colorImages[value][0]} alt={value} className="w-full h-full object-cover" />
                      {oos && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <div className="w-full h-[1.5px] bg-destructive rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                }

                if (isColor) {
                  // Color pill (no image)
                  return (
                    <button
                      key={value}
                      onClick={() => available && onSelect(name, value)}
                      disabled={!available}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all relative
                        ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-foreground'}
                        ${!available ? 'opacity-40 cursor-not-allowed line-through' : 'hover:border-primary/50'}
                      `}
                    >
                      {value}
                      {oos && <span className="ml-1 text-destructive text-[10px]">●</span>}
                    </button>
                  );
                }

                // Generic chip (size, material, etc.)
                return (
                  <button
                    key={value}
                    onClick={() => available && onSelect(name, value)}
                    disabled={!available}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all relative
                      ${isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground'}
                      ${!available ? 'opacity-35 cursor-not-allowed' : 'hover:border-primary/60 active:scale-95'}
                    `}
                  >
                    {value}
                    {oos && !isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="block w-full h-[1.5px] bg-muted-foreground/60 rotate-45" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}