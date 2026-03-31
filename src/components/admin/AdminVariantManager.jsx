import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Manages ProductVariant records for a product.
 * Shows existing variants and a form to add new ones.
 */
export default function AdminVariantManager({ productId, variantOptions = [], variants = [], onVariantsChange }) {
  const queryClient = useQueryClient();
  const [newVariant, setNewVariant] = useState({ combination: {}, stock: 0, price: '' });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductVariant.create({ product_id: productId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      setNewVariant({ combination: {}, stock: 0, price: '' });
      toast.success('Variante agregada');
      onVariantsChange?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductVariant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      toast.success('Variante eliminada');
      onVariantsChange?.();
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }) => base44.entities.ProductVariant.update(id, { stock: parseInt(stock) || 0 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants', productId] }),
  });

  const allOptionsSet = variantOptions.length > 0 && variantOptions.every(o => newVariant.combination[o.name]);

  const handleAdd = () => {
    if (!allOptionsSet) { toast.error('Selecciona todas las opciones'); return; }
    createMutation.mutate({
      combination: newVariant.combination,
      stock: parseInt(newVariant.stock) || 0,
      price: newVariant.price ? parseFloat(newVariant.price) : null,
    });
  };

  if (!variantOptions.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Agrega opciones de variantes arriba para gestionar el inventario por variante.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Existing variants */}
      {variants.length > 0 && (
        <div className="space-y-2">
          {variants.map(v => (
            <div key={v.id} className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
              <div className="flex-1 text-xs text-foreground">
                {Object.entries(v.combination || {}).map(([k, val]) => `${k}: ${val}`).join(' · ')}
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={v.stock || 0}
                  onChange={e => updateStockMutation.mutate({ id: v.id, stock: e.target.value })}
                  className="h-7 w-16 text-xs text-center"
                />
                <span className="text-[10px] text-muted-foreground">uds</span>
              </div>
              {v.price && <span className="text-xs font-medium text-primary">${v.price?.toFixed(2)}</span>}
              <button onClick={() => deleteMutation.mutate(v.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new variant */}
      <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground mb-2">+ Nueva variante</p>
        {variantOptions.map(o => (
          <div key={o.name}>
            <Label className="text-[10px]">{o.name}</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {o.values.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewVariant(prev => ({ ...prev, combination: { ...prev.combination, [o.name]: v } }))}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    newVariant.combination[o.name] === v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label className="text-[10px]">Stock</Label>
            <Input
              type="number"
              value={newVariant.stock}
              onChange={e => setNewVariant(prev => ({ ...prev, stock: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-[10px]">Precio (opcional)</Label>
            <Input
              type="number"
              placeholder="Base"
              value={newVariant.price}
              onChange={e => setNewVariant(prev => ({ ...prev, price: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!allOptionsSet || createMutation.isPending}
          className="w-full h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Agregar variante
        </Button>
      </div>
    </div>
  );
}