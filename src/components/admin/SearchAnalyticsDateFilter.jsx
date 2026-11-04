import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function SearchAnalyticsDateFilter({ value, onChange }) {
  const [startDate, setStartDate] = useState(value?.startDate || '');
  const [endDate, setEndDate] = useState(value?.endDate || '');
  const invalid = Boolean(startDate && endDate && startDate > endDate);
  const showAll = () => {
    setStartDate('');
    setEndDate('');
    onChange(null);
  };
  const applyDates = (event) => {
    event.preventDefault();
    if (startDate && endDate && !invalid) onChange({ startDate, endDate });
  };
  const displayDate = (date) => date.split('-').reverse().join('/');

  return (
    <form onSubmit={applyDates} className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor="search-analytics-from" className="min-w-0 space-y-1 text-xs text-muted-foreground">
          <span>Desde</span>
          <Input id="search-analytics-from" type="date" required value={startDate}
            max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)}
            className="min-w-0 max-w-full px-2 text-xs text-foreground" />
        </label>
        <label htmlFor="search-analytics-to" className="min-w-0 space-y-1 text-xs text-muted-foreground">
          <span>Hasta</span>
          <Input id="search-analytics-to" type="date" required value={endDate}
            min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)}
            className="min-w-0 max-w-full px-2 text-xs text-foreground" />
        </label>
      </div>
      {invalid && <p role="alert" className="text-xs text-destructive">La fecha final debe ser igual o posterior a la inicial.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!startDate || !endDate || invalid}
          className="flex-1 rounded-full border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">Aplicar fechas</button>
        <button type="button" onClick={showAll} aria-pressed={!value}
          className={`rounded-full border px-4 py-2 text-xs font-medium ${!value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-foreground'}`}>Todo</button>
      </div>
      <p aria-live="polite" className="text-[11px] text-muted-foreground">
        {value ? `Mostrando: ${displayDate(value.startDate)} al ${displayDate(value.endDate)}. Incluye ambos días.` : 'Mostrando: todo el historial.'} Hora de El Salvador.
      </p>
    </form>
  );
}