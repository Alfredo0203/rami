import React from 'react';

/**
 * Renders attribute-based variant selectors (e.g. Color, Talla).
 * Props:
 *   variants      — array of ProductVariant records
 *   selected      — currently selected variant object (or null)
 *   onSelect      — (variant) => void
 */
export default function VariantSelector({ variants, selected, onSelect }) {
  if (!variants || variants.length === 0) return null;

  // Collect all attribute keys across all variants
  const attrKeys = [...new Set(
    variants.flatMap(v => Object.keys(v.attributes || {}))
  )];

  // If no attributes defined, fall back to showing variants by name
  const useNameFallback = attrKeys.length === 0;

  if (useNameFallback) {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Variante: <span className="text-foreground normal-case">{selected?.name || '—'}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => {
            const isSelected = selected?.id === v.id;
            const available = v.stock == null || v.stock > 0;
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                disabled={!available}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : available
                      ? 'border-border bg-secondary text-foreground hover:border-primary'
                      : 'border-border bg-secondary text-muted-foreground line-through opacity-50 cursor-not-allowed',
                ].join(' ')}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Attribute-based selection
  const selectedAttrs = selected?.attributes || {};

  const handleAttrSelect = (key, value) => {
    const newAttrs = { ...selectedAttrs, [key]: value };
    let match = variants.find(v =>
      attrKeys.every(k => v.attributes?.[k] === newAttrs[k])
    );
    if (!match) {
      match = variants.find(v => v.attributes?.[key] === value);
    }
    if (match) onSelect(match);
  };

  return (
    <div className="space-y-3">
      {attrKeys.map(key => {
        const values = [...new Set(variants.map(v => v.attributes?.[key]).filter(Boolean))];
        return (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {key}: <span className="text-foreground normal-case">{selectedAttrs[key] || '—'}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = selectedAttrs[key] === val;
                const available = variants.some(
                  v => v.attributes?.[key] === val && (v.stock == null || v.stock > 0)
                );
                return (
                  <button
                    key={val}
                    onClick={() => handleAttrSelect(key, val)}
                    disabled={!available}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : available
                          ? 'border-border bg-secondary text-foreground hover:border-primary'
                          : 'border-border bg-secondary text-muted-foreground line-through opacity-50 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {val}
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