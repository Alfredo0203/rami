import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_VARIANT = { name: '', sku: '', price: '', original_price: '', stock: 0, is_active: true, image_url: '' };

export default function AdminVariantManager({ product }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVariant, setNewVariant] = useState(EMPTY_VARIANT);
  const [attrPairs, setAttrPairs] = useState([{ key: 'Color', value: '' }]);
  const [uploadingImg, setUploadingImg] = useState(false);

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
      setAttrPairs([{ key: 'Color', value: '' }]);
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewVariant(v => ({ ...v, image_url: file_url }));
    setUploadingImg(false);
  };

  const handleCreate = () => {
    const attributes = {};
    attrPairs.forEach(({ key, value }) => { if (key.trim() && value.trim()) attributes[key.trim()] = value.trim(); });
    createMutation.mutate({
      product_id: product.id,
      name: newVariant.name || attrPairs.filter(p => p.value).map(p => p.value).join(' / '),
      sku: newVariant.sku,
      price: parseFloat(newVariant.price) || undefined,
      original_price: parseFloat(newVariant.original_price) || undefined,
      stock: parseInt(newVariant.stock) || 0,
      is_active: newVariant.is_active,
      image_url: newVariant.image_url || undefined,
      attributes,
    });
  };

  const isValid = attrPairs.some(p => p.key.trim() && p.value.trim()) || newVariant.name.trim();

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
              {variants.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No hay variantes aún.</p>
              )}
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2">
                  {v.image_url && (
                    <img src={v.image_url} alt={v.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {v.stock ?? '—'} · ${v.price ?? '—'}
                      {v.sku ? ` · ${v.sku}` : ''}
                    </p>
                    {v.attributes && Object.keys(v.attributes).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
            <div className="border border-border rounded-xl p-3 space-y-3 bg-card">

              {/* Atributos primero — lo más importante */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Atributos de la variante</Label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Ej: Color → Negro, Talla → XL. Cada par define la opción seleccionable.
                </p>
                <div className="space-y-1.5">
                  {attrPairs.map((pair, i) => (
                    <div key={i} className="flex gap-1.5 items-center">
                      <Input
                        value={pair.key}
                        onChange={e => setAttrPairs(prev => prev.map((p, j) => j === i ? { ...p, key: e.target.value } : p))}
                        className="h-8 text-xs"
                        placeholder="Ej: Color"
                      />
                      <Input
                        value={pair.value}
                        onChange={e => setAttrPairs(prev => prev.map((p, j) => j === i ? { ...p, value: e.target.value } : p))}
                        className="h-8 text-xs"
                        placeholder="Ej: Negro"
                      />
                      {attrPairs.length > 1 && (
                        <button onClick={() => setAttrPairs(p => p.filter((_, j) => j !== i))} className="p-1 text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setAttrPairs(p => [...p, { key: '', value: '' }])} className="text-xs text-primary hover:underline">
                    + Otro atributo
                  </button>
                </div>
              </div>

              {/* Imagen de la variante */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Imagen de esta variante</Label>
                <div className="flex items-center gap-2">
                  {newVariant.image_url ? (
                    <div className="relative">
                      <img src={newVariant.image_url} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
                      <button onClick={() => setNewVariant(v => ({ ...v, image_url: '' }))} className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-secondary">
                      {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                  <p className="text-[11px] text-muted-foreground">Foto del color o modelo<br />(opcional pero recomendado)</p>
                </div>
              </div>

              {/* Precio y stock */}
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Precio ($)</Label><Input type="number" value={newVariant.price} onChange={e => setNewVariant({...newVariant, price: e.target.value})} className="h-8 text-xs" placeholder={product.price} /></div>
                <div><Label className="text-xs">Precio original</Label><Input type="number" value={newVariant.original_price} onChange={e => setNewVariant({...newVariant, original_price: e.target.value})} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Stock</Label><Input type="number" value={newVariant.stock} onChange={e => setNewVariant({...newVariant, stock: e.target.value})} className="h-8 text-xs" /></div>
              </div>

              {/* Nombre y SKU opcionales */}
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-muted-foreground">Nombre (opcional)</Label><Input value={newVariant.name} onChange={e => setNewVariant({...newVariant, name: e.target.value})} className="h-8 text-xs" placeholder="Se genera automático" /></div>
                <div><Label className="text-xs text-muted-foreground">SKU (opcional)</Label><Input value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} className="h-8 text-xs" /></div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending || !isValid} size="sm" className="flex-1 h-8 text-xs bg-primary text-primary-foreground rounded-full">
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar variante'}
                </Button>
                <Button onClick={() => { setAdding(false); setNewVariant(EMPTY_VARIANT); setAttrPairs([{ key: 'Color', value: '' }]); }} size="sm" variant="outline" className="h-8 text-xs rounded-full">
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