import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import AdminVariantManager from '@/components/admin/AdminVariantManager';

export default function AdminProductForm({ product, categories, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    full_description: product?.full_description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    stock: product?.stock || 0,
    is_featured: product?.is_featured || false,
    is_active: product?.is_active !== false,
    images: product?.images || [],
    tags: product?.tags?.join(', ') || '',
    has_variants: product?.has_variants || false,
    variant_options: product?.variant_options || [],
    color_images: product?.color_images || {},
    attributes: product?.attributes || {},
  });

  const [uploading, setUploading] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');

  const { data: variants = [] } = useQuery({
    queryKey: ['variants', product?.id],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: product.id }),
    enabled: !!product?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? base44.entities.Product.update(product.id, data)
        : base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEditing ? 'Producto actualizado!' : 'Producto creado!');
      onClose();
    },
  });

  const handleSubmit = () => {
    const data = {
      ...form,
      price: parseFloat(form.price) || 0,
      original_price: parseFloat(form.original_price) || 0,
      stock: parseInt(form.stock) || 0,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    saveMutation.mutate(data);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, images: [...prev.images, file_url] }));
    setUploading(false);
  };

  const removeImage = (idx) =>
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const addVariantOption = () => {
    if (!newOptionName.trim() || !newOptionValues.trim()) return;
    const values = newOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    setForm(prev => ({
      ...prev,
      variant_options: [...prev.variant_options, { name: newOptionName.trim(), values }],
    }));
    setNewOptionName('');
    setNewOptionValues('');
  };

  const removeVariantOption = (idx) =>
    setForm(prev => ({ ...prev, variant_options: prev.variant_options.filter((_, i) => i !== idx) }));

  const addAttribute = () => {
    if (!newAttrKey.trim() || !newAttrVal.trim()) return;
    setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [newAttrKey.trim()]: newAttrVal.trim() } }));
    setNewAttrKey('');
    setNewAttrVal('');
  };

  const removeAttribute = (key) => {
    setForm(prev => {
      const updated = { ...prev.attributes };
      delete updated[key];
      return { ...prev, attributes: updated };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-2 bg-secondary rounded-full"><X className="w-4 h-4 text-foreground" /></button>
        </div>

        <div><Label className="text-xs">Nombre</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-sm" /></div>
        <div><Label className="text-xs">Descripción corta</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="text-sm h-16" /></div>
        <div><Label className="text-xs">Descripción completa</Label><Textarea value={form.full_description} onChange={e => setForm({...form, full_description: e.target.value})} className="text-sm h-24" /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Precio ($)</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">Precio original ($)</Label><Input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} className="h-9 text-sm" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Categoría</Label>
            <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Marca</Label><Input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="h-9 text-sm" placeholder="Nike, Samsung…" /></div>
        </div>

        {!form.has_variants && (
          <div><Label className="text-xs">Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-9 text-sm" /></div>
        )}

        <div><Label className="text-xs">Tags (separados por coma)</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="h-9 text-sm" placeholder="moda, verano" /></div>

        {/* Images */}
        <div>
          <Label className="text-xs">Imágenes</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {form.images.map((url, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        {/* Attributes */}
        <div>
          <Label className="text-xs">Atributos / Especificaciones</Label>
          <p className="text-[10px] text-muted-foreground mb-1">Ej: Material → Algodón, Voltaje → 110V</p>
          {Object.entries(form.attributes).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-secondary px-2 py-1 rounded flex-1">{k}: {v}</span>
              <button onClick={() => removeAttribute(k)} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <div className="flex gap-1 mt-1">
            <Input value={newAttrKey} onChange={e => setNewAttrKey(e.target.value)} placeholder="Clave" className="h-8 text-xs flex-1" />
            <Input value={newAttrVal} onChange={e => setNewAttrVal(e.target.value)} placeholder="Valor" className="h-8 text-xs flex-1" />
            <Button type="button" size="sm" variant="outline" onClick={addAttribute} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* Variants */}
        <div className="bg-secondary/40 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Variantes de producto</p>
              <p className="text-xs text-muted-foreground">Color, Talla, Material, etc.</p>
            </div>
            <Switch checked={form.has_variants} onCheckedChange={v => setForm({...form, has_variants: v})} />
          </div>

          {form.has_variants && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Opciones de variante</Label>
                {form.variant_options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-card border border-border px-2 py-1 rounded flex-1">
                      <span className="font-medium">{opt.name}:</span> {opt.values.join(', ')}
                    </span>
                    <button onClick={() => removeVariantOption(idx)} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  <Input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="Nombre (ej: Color)" className="h-8 text-xs w-1/3" />
                  <Input value={newOptionValues} onChange={e => setNewOptionValues(e.target.value)} placeholder="Valores separados por coma" className="h-8 text-xs flex-1" />
                  <Button type="button" size="sm" variant="outline" onClick={addVariantOption} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {isEditing ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowVariants(v => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {showVariants ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Gestionar SKUs / Stock por variante ({variants.length})
                  </button>
                  {showVariants && (
                    <div className="mt-2">
                      <AdminVariantManager
                        productId={product.id}
                        variantOptions={form.variant_options}
                        variants={variants}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">Guarda el producto primero para agregar SKUs de variantes.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_featured} onCheckedChange={v => setForm({...form, is_featured: v})} />
            <Label className="text-xs">Destacado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
            <Label className="text-xs">Activo</Label>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full bg-primary text-primary-foreground rounded-full h-11 font-bold">
          {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? 'Actualizar Producto' : 'Crear Producto')}
        </Button>
      </div>
    </div>
  );
}