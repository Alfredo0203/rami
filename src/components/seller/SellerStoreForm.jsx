import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function SellerStoreForm({ store, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    logo_url: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        description: store.description || '',
        phone: store.phone || '',
        logo_url: store.logo_url || '',
      });
    }
  }, [store]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Store.update(store.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-stores'] });
      toast.success('Tienda actualizada');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Error al guardar');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo actualizado');
    } catch (err) {
      toast.error('Error al subir logo');
    }
    setUploadingLogo(false);
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error('El nombre de la tienda es requerido');
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Editar Tienda</h2>
          <button onClick={onClose} className="p-1 bg-secondary rounded hover:bg-muted">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div>
            <Label className="text-xs mb-2 block">Logo de la tienda</Label>
            {form.logo_url && (
              <div className="mb-2">
                <img src={form.logo_url} alt="Logo" className="w-20 h-20 rounded-lg object-cover" />
              </div>
            )}
            <label className="w-full border-2 border-dashed border-border rounded-lg flex items-center justify-center py-4 cursor-pointer hover:bg-secondary transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground mr-2" />
              <span className="text-xs text-muted-foreground">Cambiar logo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </label>
            {uploadingLogo && <p className="text-xs text-muted-foreground mt-1">Subiendo...</p>}
          </div>

          <div>
            <Label className="text-xs">Nombre de la tienda*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Mi Tienda"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Describe tu tienda..."
              className="text-sm h-20 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs">Teléfono de contacto</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              placeholder="+503 ..."
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border">
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
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}