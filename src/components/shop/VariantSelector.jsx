import React, { useMemo } from 'react';
import { Check } from 'lucide-react';

/**
 * VariantSelector — Tipo Temu/Shein (arquitectura escalable)
 *
 * ✨ Soporta:
 *   - Productos sin variantes (fallback simple)
 *   - Productos con 1+ dimensiones de variantes (Color, Talla, Material, etc.)
 *   - Combinaciones multi-atributo (Color + Talla + Material)
 *   - Validación automática de combinaciones válidas
 *   - Cascada inteligente (al elegir un atributo, actualiza los demás disponibles)
 *   - Imagen por variante que cambia automáticamente
 *   - Precio y stock dinámico según combinación
 *
 * 📚 Documentación completa en /docs:
 *   - VARIANT_QUICK_START.md       → 5 min overview
 *   - VARIANT_ARCHITECTURE.md      → Estructura técnica completa
 *   - VARIANT_UI_EXAMPLES.md       → Ejemplos visuales por tipo
 *   - VARIANT_BEST_PRACTICES.md    → Best practices & recomendaciones
 *
 * Props:
 *   variants    – array de ProductVariant con { attributes, price, stock, image_url, etc. }
 *   selected    – variante actualmente seleccionada (puede ser null)
 *   onSelect    – callback(variant) cuando el usuario confirma una selección válida
 *
 * Ejemplos de uso:
 *   <VariantSelector variants={variants} selected={selected} onSelect={setSelected} />
 *
 * Casos soportados:
 *   - Ropa:        { Color, Talla, Fit, Material }
 *   - Electrónica: { RAM, Almacenamiento, Color, Modelo }
 *   - Belleza:     { Volumen, Aroma, Concentración }
 *   - Hogar:       { Tamaño, Color, Material }
 *   - Cualquier combinación de atributos
 */
export default function VariantSelector({ variants, selected, onSelect }) {
  if (!variants || variants.length === 0) return null;

  // ────────────────────────────────────────────────────────────────────────────
  // 1. EXTRAER ESTRUCTURA DE ATRIBUTOS
  // ────────────────────────────────────────────────────────────────────────────
  // Claves presentes en cualquier variante del producto (nuevo formato: array)
  const attrKeys = useMemo(() => {
    const keys = new Set();
    variants.forEach(v => {
      if (Array.isArray(v.attributes)) {
        v.attributes.forEach(attr => keys.add(attr.key));
      }
    });
    return Array.from(keys).sort(); // orden alfabético para consistencia
  }, [variants]);

  // ────────────────────────────────────────────────────────────────────────────
  // 2. FALLBACK: Sin atributos (variantes por nombre)
  // ────────────────────────────────────────────────────────────────────────────
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
              isAvailable={(v.stock ?? 0) > 0 && v.is_active !== false}
              onClick={() => onSelect(v)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. LÓGICA DE VALIDACIÓN Y CASCADA (Nuevo formato: array de {key, values})
  // ────────────────────────────────────────────────────────────────────────────

  const selectedAttrs = selected?.attributes || [];

  /**
   * Convierte array de {key, values} a objeto lookup para búsquedas rápidas
   */
  const selectedAttrsLookup = useMemo(() => {
    const lookup = {};
    if (Array.isArray(selectedAttrs)) {
      selectedAttrs.forEach(attr => {
        if (attr.values.length > 0) {
          lookup[attr.key] = attr.values; // Múltiples valores posibles
        }
      });
    }
    return lookup;
  }, [selectedAttrs]);

  /**
   * Verifica si una variante coincide con los atributos seleccionados
   * (considera múltiples valores por atributo)
   */
  const variantMatchesSelection = (variant, attrKeysToCheck) => {
    if (!Array.isArray(variant.attributes)) return false;
    return attrKeysToCheck.every(key => {
      const selectedValues = selectedAttrsLookup[key];
      if (!selectedValues) return true; // Sin restricción si no está seleccionado
      
      const variantAttr = variant.attributes.find(a => a.key === key);
      if (!variantAttr) return false;
      
      // Variante debe tener al menos UNO de los valores seleccionados
      return selectedValues.some(val => variantAttr.values.includes(val));
    });
  };

  /**
   * Valida si un valor específico de un atributo es válido
   */
  const isValueAvailable = (attrKey, attrValue) => {
   const selectedWithNewValue = selectedAttrs.map(a => 
     a.key === attrKey ? { ...a, values: [attrValue] } : a
   );
   const keysToCheck = selectedWithNewValue.filter(a => a.values.length > 0).map(a => a.key);

   return variants.some(v => {
     const testAttrs = selectedWithNewValue;
     const testAttrsLookup = {};
     testAttrs.forEach(a => {
       if (a.values.length > 0) testAttrsLookup[a.key] = a.values;
     });

     const matches = v.attributes?.every(vattr => {
       const selectedValues = testAttrsLookup[vattr.key];
       if (!selectedValues) return true;
       return selectedValues.some(val => vattr.values.includes(val));
     });

     return matches && (v.stock ?? 0) > 0 && v.is_active !== false;
   });
  };

  /**
   * Al seleccionar un valor, busca variante que lo contiene
   */
  const handleSelect = (attrKey, attrValue) => {
    // Busca variante que contiene este atributo con este valor
    const match = variants.find(v => {
      if (!Array.isArray(v.attributes)) return false;
      const attrGroup = v.attributes.find(a => a.key === attrKey);
      return (
        attrGroup &&
        attrGroup.values.includes(attrValue) &&
        (v.stock ?? 0) > 0 &&
        v.is_active !== false
      );
    });
    if (match) onSelect(match);
  };

  /**
   * Extrae todos los valores únicos de un atributo
   */
  const getAttrValues = (attrKey) => {
    const values = [];
    const seen = new Set();
    variants.forEach(v => {
      if (Array.isArray(v.attributes)) {
        const attr = v.attributes.find(a => a.key === attrKey);
        if (attr && attr.values) {
          attr.values.forEach(val => {
            if (!seen.has(val)) {
              values.push(val);
              seen.add(val);
            }
          });
        }
      }
    });
    return values;
  };

  /**
   * Obtiene imagen de una variante que contiene este valor de atributo
   */
  const getSwatchImage = (attrKey, attrValue) => {
    const v = variants.find(
      vv => Array.isArray(vv.attributes) &&
        vv.attributes.some(a => a.key === attrKey && a.values.includes(attrValue)) &&
        vv.image_url
    );
    return v?.image_url || null;
  };

  /**
   * Detecta si este atributo se debe mostrar como swatches visuales
   * (para colores) o como chips de texto (para tallas, capacidad, etc.)
   */
  const shouldUseSwatchStyle = (attrKey) => {
    // Heurística: si el nombre contiene "color" o hay imágenes disponibles
    if (/color|colour/i.test(attrKey)) return true;
    const values = getAttrValues(attrKey);
    return values.some(val => getSwatchImage(attrKey, val));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 4. RENDER: Secciones de atributos
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {attrKeys.map(attrKey => {
        const values = getAttrValues(attrKey);
        const selectedAttrGroup = selectedAttrs.find(a => a.key === attrKey);
        const selectedValues = selectedAttrGroup?.values || [];
        const useSwatchStyle = shouldUseSwatchStyle(attrKey);

        return (
          <div key={attrKey} className="space-y-2.5">
            {/* Header del atributo */}
            <div className="flex items-baseline gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {attrKey}
              </p>
              {selectedValues.length > 0 && (
                <span className="text-xs font-semibold text-foreground">
                  {selectedValues.join(', ')}
                </span>
              )}
            </div>

            {/* Opciones */}
            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = selectedValues.includes(value);
                const available = isValueAvailable(attrKey, value);
                const imgUrl = getSwatchImage(attrKey, value);

                if (useSwatchStyle) {
                  // SWATCH: para colores e imágenes
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

                // CHIP: para tallas, capacidad, material, etc.
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

/**
 * SwatchButton — Botón visual para atributos que se muestran con imagen/color
 * Usado para: Color, Estilo, Modelo (si tienen imágenes)
 */
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
      {/* Imagen/Color del swatch */}
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

        {/* Check badge (seleccionado) */}
        {isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 pointer-events-none" />
        )}
        {isSelected && (
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}

        {/* Línea diagonal (sin stock) */}
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

      {/* Etiqueta */}
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

/**
 * ChipButton — Botón de texto para atributos sin imagen (Talla, Capacidad, Material)
 */
function ChipButton({ label, isSelected, isAvailable, onClick }) {
  return (
    <button
      type="button"
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      className={[
        'relative px-4 py-2 rounded-full text-sm font-medium border-2 transition-all select-none',
        'hover:border-primary/60 active:scale-95 disabled:cursor-not-allowed',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : isAvailable
            ? 'border-border bg-secondary text-foreground'
            : 'border-border bg-secondary text-muted-foreground opacity-50',
      ].join(' ')}
    >
      {label}
      
      {/* Línea diagonal (sin stock) */}
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

/**
 * OptionChip — Para fallback de variantes sin atributos
 */
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

      <span className={[
        'text-xs font-medium leading-tight text-center',
        isSelected ? 'text-primary' : isAvailable ? 'text-foreground' : 'text-muted-foreground',
      ].join(' ')}>
        {label}
      </span>
    </button>
  );
}