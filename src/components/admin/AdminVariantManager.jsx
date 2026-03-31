import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_VARIANT = { name: '', sku: '', price: '', original_price: '', stock: 0, is_active: true, attributes: {} };

export default function AdminVariantManager({ product }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVariant, setNewVariant] = useState(EMPTY_VARIANT);
  const [attrPairs, setAttrPairs] = useState([{ key: '', value: '' }]);

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['variants', product.id],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: product.id }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductVariant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] });
      toast.success('Variante creada');
      setAdding(false);
      setNewVariant(EMPTY_VARIANT);
      setAttrPairs([{ key: '', value: '' }]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductVariant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] });
      toast.success('Variante eliminada');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ProductVariant.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants', product.id] }),
  });

  const handleCreate = () => {
    const attributes = {};
    attrPairs.forEach(({ key, value }) => { if (key && value) attributes[key] = value; });
    createMutation.mutate({
      product_id: product.id,
      name: newVariant.name,
      sku: newVariant.sku,
      price: parseFloat(newVariant.price) || undefined,
      original_price: parseFloat(newVariant.original_price) || undefined,
      stock: parseInt(newVariant.stock) || 0,
      is_active: newVariant.is_active,
      attributes,
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-sm font-semibold text-foreground"
      >
        <span>Variantes del producto ({product.has_variants ? 'activadas' : 'desactivadas'})</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {v.stock ?? '—'} · ${v.price ?? '—'}
                      {v.sku ? ` · SKU: ${v.sku}` : ''}
                    </p>
                    {v.attributes && Object.keys(v.attributes).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={v.is_active !== false}
                      onCheckedChange={(val) => toggleMutation.mutate({ id: v.id, is_active: val })}
                    />
                    <button
                      onClick={() => deleteMutation.mutate(v.id)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Nombre</Label><Input value={newVariant.name} onChange={e => setNewVariant({...newVariant, name: e.target.value})} className="h-8 text-xs" placeholder="Rojo / XL" /></div>
                <div><Label className="text-xs">SKU</Label><Input value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Precio ($)</Label><Input type="number" value={newVariant.price} onChange={e => setNewVariant({...newVariant, price: e.target.value})} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Precio original</Label><Input type="number" value={newVariant.original_price} onChange={e => setNewVariant({...newVariant, original_price: e.target.value})} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Stock</Label><Input type="number" value={newVariant.stock} onChange={e => setNewVariant({...newVariant, stock: e.target.value})} className="h-8 text-xs" /></div>
              </div>

              {/* Attributes */}
              <div>
                <Label className="text-xs">Atributos (ej: Color → Rojo)</Label>
                <div className="space-y-1 mt-1">
                  {attrPairs.map((pair, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input value={pair.key} onChange={e => setAttrPairs(prev => prev.map((p, j) => j === i ? { ...p, key: e.target.value } : p))} className="h-7 text-xs" placeholder="Color" />
                      <Input value={pair.value} onChange={e => setAttrPairs(prev => prev.map((p, j) => j === i ? { ...p, value: e.target.value } : p))} className="h-7 text-xs" placeholder="Rojo" />
                    </div>
                  ))}
                  <button onClick={() => setAttrPairs(p => [...p, { key: '', value: '' }])} className="text-xs text-primary hover:underline">
                    + Agregar atributo
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newVariant.name} size="sm" className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-full">
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar variante'}
                </Button>
                <Button onClick={() => setAdding(false)} size="sm" variant="outline" className="h-8 text-xs rounded-full">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" /> Agregar variante
            </button>
          )}
        </div>
      )}
    </div>
  );
}