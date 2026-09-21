import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronDown, ChevronUp, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPoliciesTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['admin-policies'],
    queryFn: () => base44.entities.Policy.list('sort_order'),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Policy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Sección guardada');
    },
    onError: (e) => toast.error(e.message || 'Error al guardar'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Policy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Sección creada');
    },
    onError: (e) => toast.error(e.message || 'Error al crear'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Policy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Sección eliminada');
    },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.Policy.update(id, { is_active: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const updateDraft = (id, field, value) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const getDraft = (policy) => drafts[policy.id] || {
    title: policy.title,
    last_updated: policy.last_updated || '',
    content: policy.content,
  };

  const handleSave = (policy) => {
    const draft = getDraft(policy);
    if (!draft.content?.trim()) {
      toast.error('El contenido es obligatorio');
      return;
    }
    saveMutation.mutate({ id: policy.id, data: draft });
  };

  const handleAdd = () => {
    const sectionId = `section_${Date.now()}`;
    createMutation.mutate({
      section_id: sectionId,
      title: 'Nueva sección',
      content: 'Escribe aquí el contenido en Markdown...',
      last_updated: new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' }),
      sort_order: policies.length,
      is_active: true,
    });
  };

  return (
    <div className="space-y-3 mt-3">
      <div className="flex justify-between items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Edita el contenido con formato Markdown (### subtítulos, - viñetas, **negritas**)
        </p>
        <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : policies.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">No hay secciones. Crea una con el botón "Nueva".</p>
        </div>
      ) : (
        policies.map(policy => {
          const draft = getDraft(policy);
          const isExpanded = expandedId === policy.id;
          return (
            <div key={policy.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-left gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block truncate">{draft.title || 'Sin título'}</span>
                    {!policy.is_active && (
                      <span className="text-[10px] text-muted-foreground">Oculto</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: policy.id, value: !policy.is_active })}
                  className="px-3 py-3 text-muted-foreground hover:text-foreground"
                  title={policy.is_active ? 'Ocultar' : 'Mostrar'}
                >
                  {policy.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
                    <Input
                      value={draft.title || ''}
                      onChange={e => updateDraft(policy.id, 'title', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Última actualización</label>
                    <Input
                      value={draft.last_updated || ''}
                      onChange={e => updateDraft(policy.id, 'last_updated', e.target.value)}
                      placeholder="Ej: 2 de mayo de 2026"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contenido (Markdown)</label>
                    <Textarea
                      value={draft.content || ''}
                      onChange={e => updateDraft(policy.id, 'content', e.target.value)}
                      rows={14}
                      className="text-xs font-mono resize-y"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(policy)}
                      disabled={saveMutation.isPending}
                    >
                      <Save className="w-3.5 h-3.5 mr-1" /> Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDrafts(prev => { const next = { ...prev }; delete next[policy.id]; return next; });
                        setExpandedId(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}