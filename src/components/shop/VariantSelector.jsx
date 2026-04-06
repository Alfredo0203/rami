import React, { useMemo, useState, useEffect } from 'react';
import { Check } from 'lucide-react';

/**
 * VariantSelector — corregido
 *
 * Cambios clave:
 * - La UI ya no depende de selected.attributes.values como fuente visual directa
 * - Ahora mantiene un estado interno por atributo: { Color: 'Amarillo', Talla: 'M' }
 * - Evita que salgan múltiples opciones seleccionadas al mismo tiempo
 * - Calcula disponibilidad por combinación parcial
 * - Intenta resolver la variante exacta seleccionada y la manda por onSelect
 */

export default function VariantSelector({ variants, selected, onSelect, onSelectionChange }) {
  if (!variants || variants.length === 0) return null;

  const attrKeys = useMemo(() => {
    const keys = new Set();
    variants.forEach(v => {
      if (Array.isArray(v.attributes)) {
        v.attributes.forEach(attr => {
          if (attr?.key) keys.add(attr.key);
        });
      }
    });
    return Array.from(keys);
  }, [variants]);

  const normalizeVariantToSelectionMap = (variant) => {
    const map = {};
    if (!variant || !Array.isArray(variant.attributes)) return map;

    variant.attributes.forEach(attr => {
      if (!attr?.key) return;
      if (Array.isArray(attr.values) && attr.values.length > 0) {
        map[attr.key] = attr.values[0];
      }
    });

    return map;
  };

  const [selectedMap, setSelectedMap] = useState(() =>
    normalizeVariantToSelectionMap(selected)
  );

  useEffect(() => {
    if (selected) {
      setSelectedMap(normalizeVariantToSelectionMap(selected));
    }
  }, [selected]);

  const getAttrValues = (attrKey) => {
    const values = [];
    const seen = new Set();

    variants.forEach(v => {
      if (!Array.isArray(v.attributes)) return;

      const attr = v.attributes.find(a => a.key === attrKey);
      if (!attr || !Array.isArray(attr.values)) return;

      attr.values.forEach(val => {
        if (!seen.has(val)) {
          seen.add(val);
          values.push(val);
        }
      });
    });

    return values;
  };

  const variantHasAttrValue = (variant, attrKey, attrValue) => {
    if (!Array.isArray(variant.attributes)) return false;

    const attr = variant.attributes.find(a => a.key === attrKey);
    if (!attr || !Array.isArray(attr.values)) return false;

    return attr.values.includes(attrValue);
  };

  const variantMatchesMap = (variant, map) => {
    if (!Array.isArray(variant.attributes)) return false;

    return Object.entries(map).every(([key, value]) => {
      if (!value) return true;
      return variantHasAttrValue(variant, key, value);
    });
  };

  const isVariantAvailable = (variant) =>
    variant?.is_active !== false && (variant?.stock ?? 0) > 0;

  const getAvailableVariantMatches = (map) => {
    return variants.filter(v => variantMatchesMap(v, map) && isVariantAvailable(v));
  };

  const isValueAvailable = (attrKey, attrValue) => {
    const nextMap = {
      ...selectedMap,
      [attrKey]: attrValue,
    };

    return getAvailableVariantMatches(nextMap).length > 0;
  };

  const findBestMatchingVariant = (map) => {
    const exactAvailable = getAvailableVariantMatches(map);
    if (exactAvailable.length > 0) {
      return exactAvailable[0];
    }

    const relaxedMap = { ...map };
    delete relaxedMap[Object.keys(map).find(key => !map[key])];

    const partialAvailable = variants.find(v => {
      if (!isVariantAvailable(v)) return false;
      return variantMatchesMap(v, map);
    });

    if (partialAvailable) return partialAvailable;

    return variants.find(v => isVariantAvailable(v)) || null;
  };

  const handleSelect = (attrKey, attrValue) => {
    const nextMap = {
      ...selectedMap,
      [attrKey]: attrValue,
    };

    setSelectedMap(nextMap);
    if (onSelectionChange) onSelectionChange(nextMap);

    // Only resolve and emit a variant if ALL attribute keys have been selected
    const allSelected = attrKeys.every(key => !!nextMap[key]);
    if (allSelected) {
      const match = findBestMatchingVariant(nextMap);
      if (match) onSelect(match);
    }
  };

  const getSwatchImage = (attrKey, attrValue) => {
    const matched = variants.find(v =>
      variantHasAttrValue(v, attrKey, attrValue) && v.image_url
    );
    return matched?.image_url || null;
  };

  const shouldUseSwatchStyle = (attrKey) => {
    if (/color|colour/i.test(attrKey)) return true;
    const values = getAttrValues(attrKey);
    return values.some(val => getSwatchImage(attrKey, val));
  };

  if (attrKeys.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Selecciona una opción
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => (
            <OptionChip
              key={v.id}
              label={v.name}
              imgUrl={v.image_url}
              isSelected={selected?.id === v.id}
              isAvailable={isVariantAvailable(v)}
              onClick={() => onSelect(v)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {attrKeys.map(attrKey => {
        const values = getAttrValues(attrKey);
        const selectedValue = selectedMap[attrKey] || '';
        const useSwatchStyle = shouldUseSwatchStyle(attrKey);

        return (
          <div key={attrKey} className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {attrKey}
              </p>
              {selectedValue && (
                <span className="text-xs font-semibold text-foreground">
                  {selectedValue}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = selectedValue === value;
                const available = isValueAvailable(attrKey, value);
                const imgUrl = getSwatchImage(attrKey, value);

                if (useSwatchStyle) {
                  return (
                    <SwatchButton
                      key={value}
                      label={value}
                      imgUrl={imgUrl}
                      isSelected={isSelected}
                      isAvailable={available}
                      onClick={() => handleSelect(attrKey, value)}
                    />
                  );
                }

                return (
                  <ChipButton
                    key={value}
                    label={value}
                    isSelected={isSelected}
                    isAvailable={available}
                    onClick={() => handleSelect(attrKey, value)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SwatchButton({ label, imgUrl, isSelected, isAvailable, onClick }) {
  return (
    <button
      type="button"
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      className={[
        'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none p-1',
        'w-[68px] hover:border-primary/60 active:scale-95 disabled:cursor-not-allowed',
        isSelected
          ? 'border-primary shadow-md'
          : isAvailable
            ? 'border-border'
            : 'border-border opacity-50',
      ].join(' ')}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary border border-border/50">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl text-muted-foreground">
            🎨
          </div>
        )}

        {isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 pointer-events-none" />
        )}
        {isSelected && (
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}

        {!isAvailable && (
          <>
            <div className="absolute inset-0 bg-background/20 pointer-events-none" />
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="100"
                x2="100"
                y2="0"
                stroke="hsl(var(--muted-foreground)/0.6)"
                strokeWidth="5"
              />
            </svg>
          </>
        )}
      </div>

      <span
        className={[
          'text-[10px] font-medium leading-tight text-center w-full truncate',
          isSelected ? 'text-primary' : isAvailable ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}

function ChipButton({ label, isSelected, isAvailable, onClick }) {
  return (
    <button
      type="button"
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      className={[
        'relative px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all select-none',
        'hover:border-primary/60 active:scale-95 disabled:cursor-not-allowed',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : isAvailable
            ? 'border-border bg-secondary text-foreground'
            : 'border-border bg-secondary text-muted-foreground opacity-50',
      ].join(' ')}
    >
      {label}

      {!isAvailable && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1="10"
              y1="90"
              x2="90"
              y2="10"
              stroke="hsl(var(--muted-foreground)/0.5)"
              strokeWidth="3"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

function OptionChip({ label, imgUrl, isSelected, isAvailable, onClick }) {
  return (
    <button
      type="button"
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      className={[
        'relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all select-none',
        imgUrl ? 'w-[68px] p-1' : 'px-4 py-2',
        'active:scale-95 disabled:cursor-not-allowed',
        isSelected
          ? 'border-primary shadow-md'
          : isAvailable
            ? 'border-border hover:border-primary/60'
            : 'border-border opacity-50',
      ].join(' ')}
    >
      {imgUrl && (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-secondary border border-border/50">
          <img src={imgUrl} alt={label} className="w-full h-full object-cover" />

          {isSelected && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}

          {!isAvailable && (
            <>
              <div className="absolute inset-0 bg-background/20 pointer-events-none" />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="100" x2="100" y2="0" stroke="hsl(var(--muted-foreground)/0.6)" strokeWidth="5" />
              </svg>
            </>
          )}
        </div>
      )}

      <span
        className={[
          'text-xs font-medium leading-tight text-center',
          isSelected ? 'text-primary' : isAvailable ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}