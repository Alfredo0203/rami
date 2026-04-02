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
  // Claves presentes en cualquier variante del producto
  const attrKeys = useMemo(() => {
    const keys = new Set();
    variants.forEach(v => {
      if (v.attributes) {
        Object.keys(v.attributes).forEach(k => keys.add(k));
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
  // 3. LÓGICA DE VALIDACIÓN Y CASCADA
  // ────────────────────────────────────────────────────────────────────────────

  const selectedAttrs = selected?.attributes || {};

  /**
   * Obtiene todas las variantes que coinciden parcialmente con los atributos
   * seleccionados actualmente. Permite cascada inteligente.
   */
  const getMatchingVariants = (partialAttrs) => {
    return variants.filter(v => {
      if (!v.attributes) return false;
      return Object.entries(partialAttrs).every(
        ([key, value]) => v.attributes[key] === value
      );
    });
  };

  /**
   * Valida si un valor específico de un atributo es válido
   * considerando la selección actual de otros atributos.
   */
  const isValueAvailable = (attrKey, attrValue) => {
    const desiredAttrs = { ...selectedAttrs, [attrKey]: attrValue };
    const matching = getMatchingVariants(desiredAttrs);
    return matching.some(v => (v.stock ?? 0) > 0 && v.is_active !== false);
  };

  /**
   * Al cambiar un atributo, intenta encontrar la mejor combinación válida.
   * Prioridad: 1) Exacta con stock, 2) Parcial con stock, 3) Cualquier parcial
   */
  const handleSelect = (attrKey, attrValue) => {
    const desiredAttrs = { ...selectedAttrs, [attrKey]: attrValue };

    // 1. Buscar coincidencia exacta (todos los atributos)
    let match = variants.find(v =>
      v.is_active !== false &&
      (v.stock ?? 0) > 0 &&
      attrKeys.every(k => v.attributes?.[k] === desiredAttrs[k])
    );

    // 2. Buscar con el atributo clickeado + otros ya seleccionados (si hay)
    if (!match && Object.keys(selectedAttrs).length > 0) {
      match = variants.find(v =>
        v.is_active !== false &&
        (v.stock ?? 0) > 0 &&
        Object.entries(desiredAttrs).every(([k, val]) => v.attributes?.[k] === val)
      );
    }

    // 3. Buscar solo con el atributo clickeado (sin stock)
    if (!match) {
      match = variants.find(v =>
        v.attributes?.[attrKey] === attrValue &&
        (v.is_active !== false)
      );
    }

    if (match) {
      onSelect(match);
    }
  };

  /**
   * Extrae los valores únicos de un atributo del conjunto de variantes.
   * Respeta el orden de aparición en la BD para consistencia.
   */
  const getAttrValues = (attrKey) => {
    const values = [];
    const seen = new Set();
    variants.forEach(v => {
      if (v.attributes) {
        const val = v.attributes[attrKey];
        if (val && !seen.has(val)) {
          values.push(val);
          seen.add(val);
        }
      }
    });
    return values;
  };

  /**
   * Obtiene la imagen representativa de un valor de atributo.
   * Si hay variante con imagen, la usa; sino, placeholder.
   */
  const getSwatchImage = (attrKey, attrValue) => {
    const v = variants.find(
      vv => vv.attributes?.[attrKey] === attrValue && vv.image_url
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
        const selectedValue = selectedAttrs[attrKey];
        const useSwatchStyle = shouldUseSwatchStyle(attrKey);

        return (
          <div key={attrKey} className="space-y-2.5">
            {/* Header del atributo */}
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

            {/* Opciones */}
            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = selectedValue === value;
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