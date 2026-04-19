import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, Trash2, GripVertical, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EMPTY_FORM = { name: '', icon: '', image_url: '' };

function CategoryForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
        <input
          className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          placeholder="Ej: Electrónica"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícono (nombre Lucide)</label>
        <input
          className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          placeholder="Ej: Smartphone, Shirt, Home"
          value={form.icon}
          onChange={e => set('icon', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">URL de imagen</label>
        <input
          className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border text-foreground"
          placeholder="https://..."
          value={form.image_url}
          onChange={e => set('image_url', e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 rounded-full"
          disabled={!form.name.trim() || saving}
          onClick={() => onSave(form)}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          Guardar
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminCategoriesTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create({ ...data, sort_order: categories.length }),
    onSuccess: () => { invalidate(); setShowCreate(false); toast.success('Categoría creada'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Categoría actualizada'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => { invalidate(); setDeletingId(null); toast.success('Categoría eliminada'); },
  });

  const moveCategory = async (index, direction) => {
    const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const a = sorted[index];
    const b = sorted[swapIndex];
    await Promise.all([
      base44.entities.Category.update(a.id, { sort_order: b.sort_order ?? swapIndex }),
      base44.entities.Category.update(b.id, { sort_order: a.sort_order ?? index }),
    ]);
    invalidate();
  };

  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-3 mt-3 pb-6">
      {!showCreate && (
        <Button
          onClick={() => setShowCreate(true)}
          className="w-full bg-primary text-primary-foreground rounded-full h-10"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
        </Button>
      )}

      {showCreate && (
        <CategoryForm
          onSave={(form) => createMutation.mutate(form)}
          onCancel={() => setShowCreate(false)}
          saving={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No hay categorías aún</div>
      ) : (
        sortedCategories.map((cat, idx) => (
          <div key={cat.id}>
            {editingId === cat.id ? (
              <CategoryForm
                initial={{ name: cat.name || '', icon: cat.icon || '', image_url: cat.image_url || '' }}
                onSave={(form) => updateMutation.mutate({ id: cat.id, data: form })}
                onCancel={() => setEditingId(null)}
                saving={updateMutation.isPending}
              />
            ) : (
              <div className="bg-card rounded-xl p-3 shadow-sm flex items-center gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveCategory(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    <GripVertical className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <button
                    onClick={() => moveCategory(idx, 1)}
                    disabled={idx === sortedCategories.length - 1}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    <GripVertical className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>

                {/* Image preview */}
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                    {cat.icon ? cat.icon.charAt(0) : '📁'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{cat.name}</p>
                  {cat.icon && <p className="text-[11px] text-muted-foreground">Ícono: {cat.icon}</p>}
                  <p className="text-[10px] text-muted-foreground/60">Orden: {cat.sort_order ?? idx}</p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingId(cat.id)}
                    className="p-2 bg-secondary rounded-lg hover:bg-muted"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setDeletingId(cat.id)}
                    className="p-2 bg-secondary rounded-lg hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productos asociados perderán esta categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deletingId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}