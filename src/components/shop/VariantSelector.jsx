import React from 'react';
import { Check } from 'lucide-react';

/**
 * VariantSelector — estilo Temu/Shein
 *
 * Modelo de datos soportado:
 *   Cada ProductVariant tiene `attributes: { Color: "Rojo", Talla: "XL" }`
 *   Una variante = una combinación específica (Rojo/XL, Rojo/M, Azul/XL…)
 *
 * Comportamiento:
 *   1. Agrupa los atributos por clave: Color, Talla, etc.
 *   2. Al tocar una opción, busca la variante que mejor coincide
 *      manteniendo las otras selecciones ya hechas.
 *   3. Si no hay combinación exacta disponible, busca la más cercana con stock.
 *   4. Opciones sin stock se muestran atenuadas con línea diagonal.
 *   5. Si una variante tiene image_url, el swatch muestra esa imagen.
 *
 * Props:
 *   variants    – array de ProductVariant
 *   selected    – variante actualmente seleccionada (puede ser null)
 *   onSelect    – callback(variant) cuando el usuario elige
 */
export default function VariantSelector({ variants, selected, onSelect }) {
  if (!variants || variants.length === 0) return null;

  // Extraer todas las claves de atributos presentes
  const attrKeys = [...new Set(
    variants.flatMap(v => Object.keys(v.attributes || {}))
  )];

  // ── Fallback: variantes sin atributos → chips por nombre ──────────────────
  if (attrKeys.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Opción
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => {
            const isSelected = selected?.id === v.id;
            const outOfStock = (v.stock ?? 0) <= 0;
            return (
              <OptionChip
                key={v.id}
                label={v.name}
                imgUrl={v.image_url}
                isSelected={isSelected}
                outOfStock={outOfStock}
                onClick={() => !outOfStock && onSelect(v)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Atributos reales: agrupar por clave ───────────────────────────────────
  const selectedAttrs = selected?.attributes || {};

  const handleSelect = (key, value) => {
    // Construir la selección deseada manteniendo los otros atributos
    const desired = { ...selectedAttrs, [key]: value };

    // 1. Buscar coincidencia exacta
    let match = variants.find(v =>
      attrKeys.every(k => v.attributes?.[k] === desired[k])
    );

    // 2. Si no hay exacta, buscar la que tenga stock con al menos el atributo clickeado
    if (!match) {
      match = variants.find(v =>
        v.attributes?.[key] === value && (v.stock == null || v.stock > 0)
      );
    }

    // 3. Si ninguna tiene stock, seleccionar igual (para mostrar "sin stock")
    if (!match) {
      match = variants.find(v => v.attributes?.[key] === value);
    }

    if (match) onSelect(match);
  };

  return (
    <div className="space-y-4">
      {attrKeys.map(key => {
        const values = [...new Set(variants.map(v => v.attributes?.[key]).filter(Boolean))];
        const selectedVal = selectedAttrs[key];

        // Para saber si un valor tiene stock, considerando la selección actual de otros atributos
        const isValueAvailable = (val) => {
          const desired = { ...selectedAttrs, [key]: val };
          return variants.some(v =>
            v.attributes?.[key] === val &&
            // Coincide con los otros atributos ya seleccionados (si aplica)
            Object.entries(desired).every(([k, dv]) => k === key || !v.attributes?.[k] || v.attributes[k] === dv) &&
            (v.stock == null || v.stock > 0)
          );
        };

        // Imagen del swatch: la variante que coincide con val para esta key
        const getSwatchImage = (val) => {
          const desired = { ...selectedAttrs, [key]: val };
          const v = variants.find(vv =>
            vv.attributes?.[key] === val &&
            vv.image_url
          );
          return v?.image_url || null;
        };

        const isColorKey = /color|colour/i.test(key);
        const hasImages = values.some(val => getSwatchImage(val));
        const useSwatchStyle = isColorKey || hasImages;

        return (
          <div key={key}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {key}
              {selectedVal && (
                <span className="normal-case text-foreground font-semibold ml-1.5">
                  — {selectedVal}
                </span>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = selectedVal === val;
                const available = isValueAvailable(val);
                const imgUrl = getSwatchImage(val);

                if (useSwatchStyle) {
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelect(key, val)}
                      className={[
                        'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none w-[68px] p-1',
                        isSelected
                          ? 'border-primary shadow-md'
                          : available
                            ? 'border-border hover:border-primary/50 cursor-pointer active:scale-95'
                            : 'border-border opacity-45 cursor-pointer',
                      ].join(' ')}
                    >
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={val}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            🎨
                          </div>
                        )}
                        {/* Check badge */}
                        {isSelected && (
                          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                        {/* Sin stock: línea diagonal */}
                        {!available && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="absolute inset-0 bg-background/30" />
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line x1="0" y1="100" x2="100" y2="0" stroke="hsl(var(--muted-foreground)/0.6)" strokeWidth="6" />
                            </svg>
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

                // Chip de texto (Talla, Material, etc.)
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelect(key, val)}
                    className={[
                      'relative px-4 py-2 rounded-full text-sm font-medium border-2 transition-all select-none active:scale-95',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : available
                          ? 'border-border bg-secondary text-foreground hover:border-primary/60 hover:bg-primary/5 cursor-pointer'
                          : 'border-border bg-secondary text-muted-foreground opacity-45 cursor-pointer',
                    ].join(' ')}
                  >
                    {val}
                    {!available && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <line x1="5" y1="95" x2="95" y2="5" stroke="hsl(var(--muted-foreground)/0.5)" strokeWidth="4" />
                        </svg>
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

function OptionChip({ label, imgUrl, isSelected, outOfStock, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none active:scale-95',
        imgUrl ? 'w-[68px] p-1' : 'px-4 py-2',
        isSelected
          ? 'border-primary shadow-md'
          : outOfStock
            ? 'border-border opacity-45 cursor-pointer'
            : 'border-border hover:border-primary/50 cursor-pointer',
      ].join(' ')}
    >
      {imgUrl && (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary">
          <img src={imgUrl} alt={label} className="w-full h-full object-cover" />
          {isSelected && (
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          )}
          {outOfStock && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="100" x2="100" y2="0" stroke="hsl(var(--muted-foreground)/0.6)" strokeWidth="6" />
            </svg>
          )}
        </div>
      )}
      <span className={[
        'text-xs font-medium leading-tight text-center',
        isSelected ? 'text-primary' : outOfStock ? 'text-muted-foreground' : 'text-foreground',
      ].join(' ')}>
        {label}
      </span>
    </button>
  );
}