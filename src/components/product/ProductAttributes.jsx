import React from 'react';

/**
 * Renders category-specific dynamic attributes as a specs table.
 * Props:
 *   attributes: {key: value}  — free-form key/value pairs
 *   brand: string
 */
export default function ProductAttributes({ attributes = {}, brand }) {
  const entries = Object.entries(attributes).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length && !brand) return null;

  const allEntries = [
    ...(brand ? [['Marca', brand]] : []),
    ...entries,
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">Especificaciones</h3>
      <div className="rounded-xl border border-border overflow-hidden">
        {allEntries.map(([key, value], i) => (
          <div
            key={key}
            className={`flex gap-3 px-3 py-2.5 text-sm ${i % 2 === 0 ? 'bg-secondary/40' : 'bg-card'}`}
          >
            <span className="text-muted-foreground w-28 shrink-0 font-medium">{key}</span>
            <span className="text-foreground flex-1">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}