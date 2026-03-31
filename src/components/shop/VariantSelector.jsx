import React from 'react';
import { Check } from 'lucide-react';

/**
 * VariantSelector estilo Temu/Shein:
 * - Con atributos: agrupa por clave (Color, Talla, etc.) con swatches visuales
 * - Sin atributos: muestra variantes por nombre como chips con imagen si existe
 */
export default function VariantSelector({ variants, selected, onSelect }) {
  if (!variants || variants.length === 0) return null;

  const attrKeys = [...new Set(
    variants.flatMap(v => Object.keys(v.attributes || {}))
  )];

  // ── Sin atributos: chips con imagen opcional ───────────────────────────────
  if (attrKeys.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Selecciona una opción
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
                  'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none',
                  v.image_url ? 'w-16 p-1' : 'px-4 py-2',
                  isSelected
                    ? 'border-primary shadow-sm'
                    : outOfStock
                      ? 'border-border opacity-40 cursor-not-allowed'
                      : 'border-border hover:border-primary/60 cursor-pointer',
                ].join(' ')}
              >
                {v.image_url && (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary">
                    <img src={v.image_url} alt={v.name} className={`w-full h-full object-cover ${outOfStock ? 'opacity-40' : ''}`} />
                    {isSelected && (
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-muted-foreground/60 rotate-45 transform" />
                      </div>
                    )}
                  </div>
                )}
                <span className={[
                  'text-xs font-medium leading-tight text-center',
                  isSelected ? 'text-primary' : outOfStock ? 'text-muted-foreground line-through' : 'text-foreground',
                ].join(' ')}>
                  {v.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Con atributos: agrupado por clave (Color, Talla…) ─────────────────────
  const selectedAttrs = selected?.attributes || {};

  const handleAttrSelect = (key, value) => {
    const newAttrs = { ...selectedAttrs, [key]: value };
    let match = variants.find(v =>
      attrKeys.every(k => v.attributes?.[k] === newAttrs[k])
    );
    if (!match) {
      match = variants.find(v => v.attributes?.[key] === value && (v.stock == null || v.stock > 0));
    }
    if (match) onSelect(match);
  };

  // Para el grupo de Color, agrupar las variantes por valor de color para mostrar imagen/swatch
  const getVariantsForAttrValue = (key, val) =>
    variants.filter(v => v.attributes?.[key] === val);

  return (
    <div className="space-y-4">
      {attrKeys.map(key => {
        const values = [...new Set(variants.map(v => v.attributes?.[key]).filter(Boolean))];
        const currentVal = selectedAttrs[key];
        const isColorKey = /color|colour|color/i.test(key);

        return (
          <div key={key}>
            {/* Label del grupo */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {key}
              {currentVal && (
                <span className="normal-case text-foreground font-medium ml-1.5">— {currentVal}</span>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = currentVal === val;
                const variantsForVal = getVariantsForAttrValue(key, val);
                const available = variantsForVal.some(v => v.stock == null || v.stock > 0);
                // Imagen: tomar la primera variante con imagen para este valor
                const imgUrl = variantsForVal.find(v => v.image_url)?.image_url;

                if (imgUrl || isColorKey) {
                  // Swatch con imagen o cuadrado de color
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => available && handleAttrSelect(key, val)}
                      className={[
                        'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none w-16 p-1',
                        isSelected
                          ? 'border-primary shadow-sm'
                          : available
                            ? 'border-border hover:border-primary/60 cursor-pointer'
                            : 'border-border opacity-40 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary">
                        {imgUrl
                          ? <img src={imgUrl} alt={val} className={`w-full h-full object-cover ${!available ? 'opacity-40' : ''}`} />
                          : <div className="w-full h-full flex items-center justify-center text-lg">🎨</div>
                        }
                        {isSelected && (
                          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                        {!available && (
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                            <div className="w-full h-px bg-muted-foreground/60 rotate-45 transform" />
                          </div>
                        )}
                      </div>
                      <span className={[
                        'text-[10px] font-medium leading-tight text-center w-full truncate',
                        isSelected ? 'text-primary' : !available ? 'text-muted-foreground' : 'text-foreground',
                      ].join(' ')}>
                        {val}
                      </span>
                    </button>
                  );
                }

                // Chip de texto (para tallas, etc.)
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
                          : 'border-border bg-secondary text-muted-foreground line-through opacity-40 cursor-not-allowed',
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