import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminVariantManager from './AdminVariantManager';

export default function AdminProductForm({ product, categories, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    color: product?.color || '',
    stock: product?.stock || 0,
    store_id: product?.store_id || '',
    rating: product?.rating || 0,
    review_count: product?.review_count || 0,
    sold_count: product?.sold_count || 0,
    is_featured: product?.is_featured || false,
    is_active: product?.is_active !== false,
    has_variants: product?.has_variants || false,
    images: product?.images || [],
    tags: product?.tags?.join(', ') || '',
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) return base44.entities.Product.update(product.id, data);
      return base44.entities.Product.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEditing ? '¡Producto actualizado!' : '¡Producto creado!');
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

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  return (
    <>
    {previewUrl && (
      <div
        className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
        onClick={() => setPreviewUrl(null)}
      >
        <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
          <img src={previewUrl} alt="Vista previa" className="w-full max-h-[80vh] object-contain rounded-2xl" />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    )}
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{isEditing ? 'Editar Producto' : 'Agregar Producto'}</h2>
          <button onClick={onClose} className="p-2 bg-secondary rounded-full"><X className="w-4 h-4 text-foreground" /></button>
        </div>

        <div><Label className="text-xs">Nombre</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-sm" /></div>
        <div><Label className="text-xs">Descripción</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="text-sm h-20" /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Precio ($)</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">Precio Original ($)</Label><Input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} className="h-9 text-sm" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Categoría</Label>
            <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Inventario</Label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-9 text-sm" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Marca</Label><Input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="h-9 text-sm" placeholder="Nike, Samsung…" /></div>
          <div><Label className="text-xs">Color</Label><Input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-9 text-sm" placeholder="Rojo, Azul…" /></div>
        </div>

        <div>
          <Label className="text-xs">Tienda (opcional)</Label>
          <Select value={form.store_id} onValueChange={v => setForm({...form, store_id: v})}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sin tienda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sin tienda</SelectItem>
              {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div><Label className="text-xs">Etiquetas (separadas por coma)</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="h-9 text-sm" placeholder="moda, verano" /></div>

        {/* Imágenes */}
        <div>
          <Label className="text-xs">Imágenes</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {form.images.map((url, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setPreviewUrl(url)}
                />
                <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-foreground/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-primary-foreground" />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
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

        <div className="flex items-center gap-2">
          <Switch checked={form.has_variants} onCheckedChange={v => setForm({...form, has_variants: v})} />
          <Label className="text-xs">Tiene variantes (color, talla, etc.)</Label>
        </div>

        {isEditing && product?.id && (
          <AdminVariantManager product={{ ...product, has_variants: form.has_variants }} />
        )}

        <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full bg-primary text-primary-foreground rounded-full h-11 font-bold">
          {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? 'Actualizar Producto' : 'Crear Producto')}
        </Button>
      </div>
    </div>
    </>
  );
}