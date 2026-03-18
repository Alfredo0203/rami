import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import AddressForm from '@/components/addresses/AddressForm';

const EMPTY_FORM = {
  label: 'Casa', full_name: '', phone: '', departamento: '', municipio: '',
  street: '', house_number: '', dui: '', country: 'El Salvador',
};

export default function Addresses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {});
  }, []);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', userEmail],
    queryFn: () => base44.entities.Address.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingId
      ? base44.entities.Address.update(editingId, data)
      : base44.entities.Address.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', userEmail] });
      setShowForm(false);
      setEditingId(null);
      setEditingData(null);
      toast.success('Dirección guardada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Address.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', userEmail] });
      toast.success('Dirección eliminada');
    },
  });

  const openNew = () => { setEditingId(null); setEditingData(null); setShowForm(true); };
  const openEdit = (addr) => { setEditingId(addr.id); setEditingData(addr); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setEditingData(null); };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">Mis Direcciones</h1>
        {!showForm && (
          <Button size="sm" onClick={openNew} className="bg-primary text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-xl p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-foreground mb-3">
                {editingId ? 'Editar Dirección' : 'Nueva Dirección'}
              </h3>
              <AddressForm
                initial={editingData || EMPTY_FORM}
                onSave={(data) => saveMutation.mutate(data)}
                onCancel={closeForm}
                isSaving={saveMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Sin direcciones guardadas</p>
            <p className="text-sm text-muted-foreground">Agrega una dirección para checkout más rápido</p>
          </div>
        ) : (
          <AnimatePresence>
            {addresses.map(addr => (
              <motion.div
                key={addr.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{addr.full_name} · {addr.label}</p>
                      <p className="text-xs text-muted-foreground">{addr.street}{addr.house_number ? `, ${addr.house_number}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{addr.municipio}, {addr.departamento}</p>
                      <p className="text-xs text-muted-foreground">{addr.phone}</p>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-1">
                          <Check className="w-3 h-3" /> Predeterminada
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(addr)} className="p-2 text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(addr.id)} className="p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}