// Historial de atributos ya usados en el catálogo.
// Se usa solo para sugerir valores al admin (no altera la lógica de variantes).

export function buildVariantHistory(variants = []) {
  const keysMap = new Map(); // normKey -> { label, count }
  const valuesMap = new Map(); // normKey -> Map(normValue -> { label, count })

  (variants || []).forEach((variant) => {
    const attrs = Array.isArray(variant?.attributes) ? variant.attributes : [];
    attrs.forEach((attr) => {
      const key = String(attr?.key || '').trim();
      if (!key) return;

      const normKey = key.toLowerCase();
      const keyEntry = keysMap.get(normKey) || { label: key, count: 0 };
      keyEntry.count += 1;
      keysMap.set(normKey, keyEntry);

      if (!valuesMap.has(normKey)) valuesMap.set(normKey, new Map());
      const values = valuesMap.get(normKey);

      (Array.isArray(attr.values) ? attr.values : []).forEach((raw) => {
        const value = String(raw || '').trim();
        if (!value) return;
        const normValue = value.toLowerCase();
        const entry = values.get(normValue) || { label: value, count: 0 };
        entry.count += 1;
        values.set(normValue, entry);
      });
    });
  });

  const keys = [...keysMap.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.label);

  const valuesByKey = {};
  valuesMap.forEach((values, normKey) => {
    valuesByKey[normKey] = [...values.values()]
      .sort((a, b) => b.count - a.count)
      .map((entry) => entry.label);
  });

  return { keys, valuesByKey };
}

// Valores sugeridos para un tipo de atributo, quitando los que ya están agregados.
export function suggestionsFor(history, key, exclude = [], limit = 14) {
  const normKey = String(key || '').trim().toLowerCase();
  if (!normKey) return [];

  const taken = new Set((exclude || []).map((value) => String(value).trim().toLowerCase()));
  return (history?.valuesByKey?.[normKey] || [])
    .filter((value) => !taken.has(value.toLowerCase()))
    .slice(0, limit);
}