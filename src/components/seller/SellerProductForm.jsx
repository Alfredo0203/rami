import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function SellerProductForm({ product, storeId, categories, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    cost_per_unit: 0,
    category_id: '',
    brand: '',
    stock: 0,
    images: [],
    is_active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        original_price: product.original_price || 0,
        cost_per_unit: product.cost_per_unit || 0,
        category_id: product.category_id || '',
        brand: product.brand || '',
        stock: product.stock || 0,
        images: product.images || [],
        is_active: product.is_active !== false,
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const productData = {
        ...data,
        store_id: storeId,
      };
      if (product) {
        return base44.entities.Product.update(product.id, productData);
      }
      return base44.entities.Product.create(productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success(product ? 'Producto actualizado' : 'Producto creado');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Error al guardar producto');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({
        ...prev,
        images: [...prev.images, file_url]
      }));
      toast.success('Imagen agregada');
    } catch (err) {
      toast.error('Error al subir imagen');
    }
    setUploadingImage(false);
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="p-1 bg-secondary rounded hover:bg-muted">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Nombre del producto*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Ej: Camiseta azul"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Detalles del producto"
              className="text-sm h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Precio*</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({...form, price: parseFloat(e.target.value)})}
                placeholder="0.00"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Precio original</Label>
              <Input
                type="number"
                value={form.original_price}
                onChange={(e) => setForm({...form, original_price: parseFloat(e.target.value)})}
                placeholder="0.00"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Costo unitario</Label>
              <Input
                type="number"
                value={form.cost_per_unit}
                onChange={(e) => setForm({...form, cost_per_unit: parseFloat(e.target.value)})}
                placeholder="0.00"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Stock</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({...form, stock: parseInt(e.target.value)})}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Categoría</Label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({...form, category_id: e.target.value})}
                className="w-full h-9 text-sm px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Marca</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({...form, brand: e.target.value})}
                placeholder="Marca"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Imágenes</Label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt={`Imagen ${i}`} className="w-full aspect-square rounded-lg object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {form.images.length < 5 && (
                <label className="w-full aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
            {uploadingImage && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({...form, is_active: e.target.checked})}
              className="w-4 h-4 rounded border-border"
            />
            <Label htmlFor="is_active" className="text-xs cursor-pointer">Producto activo</Label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-9 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="flex-1 bg-primary text-primary-foreground h-9 text-sm"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (product ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </div>
    </div>
  );
}