import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, ImagePlus, Info } from 'lucide-react';
import { toast } from 'sonner';

const COMMON_ATTR_KEYS = ['Color', 'Talla', 'Tamaño', 'Material', 'Estilo'];

const EMPTY_FORM = {
  attrKey: 'Color',
  attrValue: '',
  price: '',
  original_price: '',
  stock: '0',
  sku: '',
  image_url: '',
};

export default function AdminVariantManager({ product }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
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
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImg(false);
  };

  const handleCreate = () => {
    const key = form.attrKey.trim();
    const val = form.attrValue.trim();
    if (!key || !val) {
      toast.error('Debes completar el tipo y valor del atributo');
      return;
    }
    createMutation.mutate({
      product_id: product.id,
      name: `${key}: ${val}`,
      sku: form.sku || undefined,
      price: parseFloat(form.price) || undefined,
      original_price: parseFloat(form.original_price) || undefined,
      stock: parseInt(form.stock) || 0,
      is_active: true,
      image_url: form.image_url || undefined,
      attributes: { [key]: val },
    });
  };

  // Group variants by attribute key for display
  const attrKeyInUse = variants.length > 0
    ? Object.keys(variants[0]?.attributes || {})[0] || null
    : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-sm font-semibold text-foreground"
      >
        <span>
          Variantes ({variants.length > 0 ? `${variants.length} creadas` : product.has_variants ? 'activadas' : 'desactivadas'})
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">

          {/* Info box */}
          <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Cada variante es una opción seleccionable (ej: <strong>Color: Azul</strong>, <strong>Talla: XL</strong>).
              El cliente verá botones para elegir entre ellas.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {variants.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2 bg-secondary/50 rounded-xl">
                  No hay variantes. Agrega una abajo.
                </p>
              )}
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2">
                  {v.image_url ? (
                    <img src={v.image_url} alt={v.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-lg flex-shrink-0">
                      {v.attributes && Object.values(v.attributes)[0]?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {v.attributes && Object.keys(v.attributes).length > 0
                        ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')
                        : v.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {v.stock ?? 0} · ${v.price ?? product.price ?? '—'}
                      {v.sku ? ` · ${v.sku}` : ''}
                    </p>
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
            <div className="border-2 border-primary/30 rounded-xl p-4 space-y-3 bg-card">
              <p className="text-xs font-semibold text-foreground">Nueva variante</p>

              {/* Attribute — the core */}
              <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Tipo y valor del atributo <span className="text-destructive">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <select
                      value={form.attrKey}
                      onChange={e => setForm(f => ({ ...f, attrKey: e.target.value }))}
                      className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs mt-0.5"
                    >
                      {COMMON_ATTR_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      <option value="__custom">Otro...</option>
                    </select>
                    {form.attrKey === '__custom' && (
                      <Input
                        className="h-8 text-xs mt-1"
                        placeholder="Escribe el tipo"
                        onChange={e => setForm(f => ({ ...f, attrKey: e.target.value === '__custom' ? '' : e.target.value }))}
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Valor (ej: {form.attrKey === 'Color' ? 'Rojo, Azul, Negro' : form.attrKey === 'Talla' ? 'S, M, L, XL' : 'escribe el valor'})
                    </Label>
                    <Input
                      value={form.attrValue}
                      onChange={e => setForm(f => ({ ...f, attrValue: e.target.value }))}
                      className="h-9 text-sm mt-0.5 font-medium"
                      placeholder={form.attrKey === 'Color' ? 'Rojo' : form.attrKey === 'Talla' ? 'XL' : 'Valor'}
                      autoFocus
                    />
                  </div>
                </div>
                {form.attrKey && form.attrValue && (
                  <p className="text-[11px] text-primary font-medium">
                    → El cliente verá una opción "{form.attrKey}: <strong>{form.attrValue}</strong>"
                  </p>
                )}
              </div>

              {/* Image */}
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
                    <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                  </div>
                ) : (
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-secondary">
                    {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">Foto de esta opción</p>
                  <p className="text-[11px] text-muted-foreground">Recomendado si es por color</p>
                </div>
              </div>

              {/* Price & stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Precio ($)</Label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-xs" placeholder={String(product.price ?? '')} />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Precio tachado</Label>
                  <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Stock</Label>
                  <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !form.attrKey.trim() || !form.attrValue.trim()}
                  size="sm"
                  className="flex-1 h-9 text-xs bg-primary text-primary-foreground rounded-full"
                >
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar variante'}
                </Button>
                <Button
                  onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline py-1">
              <Plus className="w-3.5 h-3.5" /> Agregar variante
            </button>
          )}
        </div>
      )}
    </div>
  );
}