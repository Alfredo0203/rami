import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, ImagePlus, Info, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

// Sugerencias de claves por categoría — puramente cosmético/ayuda al admin
const ATTR_KEY_SUGGESTIONS = [
  'Color', 'Talla', 'Tamaño', 'Material', 'Estilo', 'Modelo',
  'Almacenamiento', 'RAM', 'Voltaje', 'Volumen', 'Aroma', 'Presentación',
  'Acabado', 'Conectividad', 'Capacidad',
];

const EMPTY_ATTR = { key: '', value: '' };
const EMPTY_FORM = {
  attrs: [{ key: '', value: '' }], // array de {key, value}
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
  const [editing, setEditing] = useState(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductVariant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] });
      toast.success('Variante actualizada');
      setEditing(null);
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

  const setAttr = (idx, field, value) => {
    setForm(f => {
      const attrs = [...f.attrs];
      attrs[idx] = { ...attrs[idx], [field]: value };
      return { ...f, attrs };
    });
  };

  const addAttr = () => setForm(f => ({ ...f, attrs: [...f.attrs, { key: '', value: '' }] }));

  const removeAttr = (idx) => setForm(f => ({
    ...f,
    attrs: f.attrs.filter((_, i) => i !== idx),
  }));

  const buildVariantData = () => {
    const validAttrs = form.attrs.filter(a => a.key.trim() && a.value.trim());
    if (validAttrs.length === 0) {
      toast.error('Agrega al menos una opción con tipo y valor');
      return null;
    }
    const attributesObj = Object.fromEntries(validAttrs.map(a => [a.key.trim(), a.value.trim()]));
    const name = validAttrs.map(a => `${a.key.trim()}: ${a.value.trim()}`).join(' / ');

    return {
      name,
      sku: form.sku || undefined,
      price: parseFloat(form.price) || undefined,
      original_price: parseFloat(form.original_price) || undefined,
      stock: parseInt(form.stock) || 0,
      image_url: form.image_url || undefined,
      attributes: attributesObj,
    };
  };

  const handleCreate = () => {
    const data = buildVariantData();
    if (!data) return;
    createMutation.mutate({ ...data, product_id: product.id, is_active: true });
  };

  const handleUpdate = () => {
    if (!editing) return;
    const data = buildVariantData();
    if (!data) return;
    updateMutation.mutate({ id: editing.id, data });
  };

  const startEdit = (variant) => {
    setEditing(variant);
    setForm({
      attrs: Object.entries(variant.attributes || {}).map(([k, v]) => ({ key: k, value: v })) || [EMPTY_ATTR],
      price: variant.price ? String(variant.price) : '',
      original_price: variant.original_price ? String(variant.original_price) : '',
      stock: String(variant.stock ?? 0),
      sku: variant.sku || '',
      image_url: variant.image_url || '',
    });
  };

  // Preview label for the "what the customer sees" hint
  const previewLabel = form.attrs
    .filter(a => a.key.trim() && a.value.trim())
    .map(a => `${a.key.trim()}: ${a.value.trim()}`)
    .join(' / ');

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-sm font-semibold text-foreground"
      >
        <span>
          Variantes ({variants.length > 0 ? `${variants.length} creadas` : 'ninguna aún'})
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {/* Info */}
          <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Cada variante representa una combinación seleccionable (ej: <strong>Color: Rojo / Talla: XL</strong> o <strong>Almacenamiento: 256GB</strong>).
              Puedes usar los atributos que apliquen a cada producto.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {variants.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2 bg-secondary/50 rounded-xl">
                  No hay variantes. Agrega una abajo.
                </p>
              )}
              {variants.map(v => (
                <VariantRow
                  key={v.id}
                  variant={v}
                  product={product}
                  onEdit={() => startEdit(v)}
                  onToggle={(val) => toggleMutation.mutate({ id: v.id, is_active: val })}
                  onDelete={() => deleteMutation.mutate(v.id)}
                />
              ))}
            </div>
          )}

          {adding || editing ? (
            <div className="border-2 border-primary/30 rounded-xl p-4 space-y-4 bg-card">
              <p className="text-xs font-semibold text-foreground">
                {editing ? 'Editar variante' : 'Nueva variante'}
              </p>

              {/* Dynamic attributes */}
              <div className="bg-secondary/60 rounded-xl p-3 space-y-3">
                <p className="text-xs font-medium text-foreground">
                  Atributos <span className="text-destructive">*</span>
                  <span className="font-normal text-muted-foreground ml-1">
                    (define las opciones que el cliente verá)
                  </span>
                </p>

                {form.attrs.map((attr, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                      <div className="relative mt-0.5">
                        <Input
                          list={`attr-keys-${idx}`}
                          value={attr.key}
                          onChange={e => setAttr(idx, 'key', e.target.value)}
                          className="h-9 text-xs"
                          placeholder="ej: Color, Talla..."
                        />
                        <datalist id={`attr-keys-${idx}`}>
                          {ATTR_KEY_SUGGESTIONS.map(k => <option key={k} value={k} />)}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Valor</Label>
                      <Input
                        value={attr.value}
                        onChange={e => setAttr(idx, 'value', e.target.value)}
                        className="h-9 text-xs mt-0.5"
                        placeholder={
                          attr.key === 'Color' ? 'ej: Rojo' :
                          attr.key === 'Talla' ? 'ej: XL' :
                          attr.key === 'Almacenamiento' ? 'ej: 256GB' :
                          'valor'
                        }
                      />
                    </div>
                    {form.attrs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttr(idx)}
                        className="h-9 w-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAttr}
                  className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Añadir otro atributo
                </button>

                {previewLabel && (
                  <p className="text-[11px] text-primary font-medium bg-primary/5 rounded-lg px-2 py-1">
                    → El cliente verá: <strong>{previewLabel}</strong>
                  </p>
                )}
              </div>

              {/* Image */}
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                ) : (
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-secondary">
                    {uploadingImg
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">Foto de esta variante</p>
                  <p className="text-[11px] text-muted-foreground">Opcional — útil para diferenciar por color o modelo</p>
                </div>
              </div>

              {/* Price & stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Precio ($)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="h-8 text-xs"
                    placeholder={String(product.price ?? '')}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Precio tachado</Label>
                  <Input
                    type="number"
                    value={form.original_price}
                    onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">SKU (opcional)</Label>
                <Input
                  value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="ej: PROD-001-ROJO-XL"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={editing ? handleUpdate : handleCreate}
                  disabled={(editing ? updateMutation.isPending : createMutation.isPending) || form.attrs.every(a => !a.key.trim() || !a.value.trim())}
                  size="sm"
                  className="flex-1 h-9 text-xs bg-primary text-primary-foreground rounded-full"
                >
                  {(editing ? updateMutation.isPending : createMutation.isPending) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : editing ? (
                    'Guardar cambios'
                  ) : (
                    'Guardar variante'
                  )}
                </Button>
                <Button
                  onClick={() => { setAdding(false); setEditing(null); setForm(EMPTY_FORM); }}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline py-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar variante
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VariantRow({ variant, product, onEdit, onToggle, onDelete }) {
  const attrLabel = variant.attributes && Object.keys(variant.attributes).length > 0
    ? Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')
    : variant.name;

  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2">
      {variant.image_url ? (
        <img
          src={variant.image_url}
          alt={variant.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-lg flex-shrink-0">
          {variant.attributes
            ? Object.values(variant.attributes)[0]?.charAt(0)?.toUpperCase()
            : '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{attrLabel}</p>
        <p className="text-xs text-muted-foreground">
          Stock: {variant.stock ?? 0}
          {' · '}${variant.price ?? product.price ?? '—'}
          {variant.sku ? ` · ${variant.sku}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch
          checked={variant.is_active !== false}
          onCheckedChange={onToggle}
        />
        <button
          onClick={onEdit}
          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}