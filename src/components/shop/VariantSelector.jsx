import React from 'react';

/**
 * VariantSelector — muestra opciones seleccionables del producto.
 * 
 * Caso A (con atributos): agrupa por clave (Color, Talla, etc.)
 * Caso B (sin atributos): muestra variantes por nombre como botones directos
 */
export default function VariantSelector({ variants, selected, onSelect }) {
  if (!variants || variants.length === 0) return null;

  // Recopilar todas las claves de atributos
  const attrKeys = [...new Set(
    variants.flatMap(v => Object.keys(v.attributes || {}))
  )];

  // ── Caso B: variantes sin atributos → botones por nombre ──────────────────
  if (attrKeys.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Opciones disponibles
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => {
            const isSelected = selected?.id === v.id;
            const outOfStock = v.stock != null && v.stock <= 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => !outOfStock && onSelect(v)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all select-none',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : outOfStock
                      ? 'border-border bg-secondary text-muted-foreground line-through opacity-50 cursor-not-allowed'
                      : 'border-border bg-secondary text-foreground hover:border-primary hover:bg-primary/5 cursor-pointer',
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

  // ── Caso A: variantes con atributos → agrupar por clave ────────────────────
  const selectedAttrs = selected?.attributes || {};

  const handleAttrSelect = (key, value) => {
    const newAttrs = { ...selectedAttrs, [key]: value };
    // Intentar match exacto en todas las claves
    let match = variants.find(v =>
      attrKeys.every(k => v.attributes?.[k] === newAttrs[k])
    );
    // Fallback: solo por la clave que cambió
    if (!match) {
      match = variants.find(v => v.attributes?.[key] === value);
    }
    if (match) onSelect(match);
  };

  return (
    <div className="space-y-3">
      {attrKeys.map(key => {
        const values = [...new Set(variants.map(v => v.attributes?.[key]).filter(Boolean))];
        const currentVal = selectedAttrs[key];
        return (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {key}{currentVal && <span className="normal-case text-foreground font-normal ml-1">— {currentVal}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = currentVal === val;
                const available = variants.some(
                  v => v.attributes?.[key] === val && (v.stock == null || v.stock > 0)
                );
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => available && handleAttrSelect(key, val)}
                    className={[
                      'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all select-none',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : available
                          ? 'border-border bg-secondary text-foreground hover:border-primary hover:bg-primary/5 cursor-pointer'
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