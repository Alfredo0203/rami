import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Addresses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    label: 'Home', full_name: '', phone: '', street: '', city: '', state: '', zip_code: '', country: 'United States'
  });

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => base44.entities.Address.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingId) return base44.entities.Address.update(editingId, data);
      return base44.entities.Address.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      setEditingId(null);
      setFormData({ label: 'Home', full_name: '', phone: '', street: '', city: '', state: '', zip_code: '', country: 'United States' });
      toast.success('Address saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Address.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address removed');
    },
  });

  const handleEdit = (addr) => {
    setFormData({ label: addr.label, full_name: addr.full_name, phone: addr.phone, street: addr.street, city: addr.city, state: addr.state, zip_code: addr.zip_code, country: addr.country || 'United States' });
    setEditingId(addr.id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">My Addresses</h1>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ label: 'Home', full_name: '', phone: '', street: '', city: '', state: '', zip_code: '', country: 'United States' }); }}
            className="bg-primary text-primary-foreground rounded-full"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground">{editingId ? 'Edit Address' : 'New Address'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Label</Label><Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="h-9 text-sm" placeholder="Home" /></div>
              <div><Label className="text-xs">Full Name</Label><Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-9 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-9 text-sm" /></div>
            <div><Label className="text-xs">Street</Label><Input value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="h-9 text-sm" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">City</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">State</Label><Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">ZIP</Label><Input value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} className="h-9 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No addresses saved</p>
            <p className="text-sm text-muted-foreground">Add an address for faster checkout</p>
          </div>
        ) : (
          <AnimatePresence>
            {addresses.map(addr => (
              <motion.div key={addr.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{addr.full_name} · {addr.label}</p>
                      <p className="text-xs text-muted-foreground">{addr.street}</p>
                      <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.zip_code}</p>
                      <p className="text-xs text-muted-foreground">{addr.phone}</p>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold mt-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(addr)} className="p-2 text-muted-foreground hover:text-foreground"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(addr.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
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