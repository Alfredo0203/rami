import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Loader2, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import AdminCouponAssignments from './AdminCouponAssignments';

export default function AdminCouponsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    minimum_order_amount: 0,
    maximum_discount_amount: '',
    is_active: true,
    starts_at: '',
    expires_at: '',
    description: '',
    assigned_user_emails: [],
  });
  const [deletingId, setDeletingId] = useState(null);
  const [selectedCouponForAssignment, setSelectedCouponForAssignment] = useState(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users-for-coupons'],
    queryFn: () => base44.entities.User.list(),
  });

  const saveCouponMutation = useMutation({
    mutationFn: (data) => {
      if (editingCoupon) {
        return base44.entities.Coupon.update(editingCoupon.id, data);
      }
      return base44.entities.Coupon.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(editingCoupon ? 'Cupón actualizado' : 'Cupón creado');
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || 'Error al guardar cupón');
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupón eliminado');
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      minimum_order_amount: 0,
      maximum_discount_amount: '',
      is_active: true,
      starts_at: '',
      expires_at: '',
      description: '',
      is_user_specific: false,
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!formData.code.trim()) {
      toast.error('El código es requerido');
      return;
    }
    if (!formData.discount_value || formData.discount_value <= 0) {
      toast.error('El valor de descuento debe ser mayor a 0');
      return;
    }

    const dataToSave = {
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      minimum_order_amount: parseFloat(formData.minimum_order_amount) || 0,
      maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : undefined,
      is_active: formData.is_active,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : undefined,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
      description: formData.description || undefined,
      is_user_specific: formData.is_user_specific,
    };

    saveCouponMutation.mutate(dataToSave);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_order_amount: coupon.minimum_order_amount || 0,
      maximum_discount_amount: coupon.maximum_discount_amount || '',
      is_active: coupon.is_active,
      starts_at: coupon.starts_at ? coupon.starts_at.split('T')[0] : '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      description: coupon.description || '',
      is_user_specific: coupon.is_user_specific || false,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-3 mt-3 pb-6">
      <Button
        onClick={() => { resetForm(); setShowForm(true); }}
        className="w-full bg-primary text-primary-foreground rounded-full h-10"
      >
        <Plus className="w-4 h-4 mr-2" /> Crear Cupón
      </Button>

      {showForm && (
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-3">
          <h3 className="font-bold text-foreground">{editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Código</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="SAVE10"
              disabled={!!editingCoupon}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Valor</label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Monto Mínimo</label>
            <Input
              type="number"
              value={formData.minimum_order_amount}
              onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {formData.discount_type === 'percentage' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Descuento Máximo (opcional)</label>
              <Input
                type="number"
                value={formData.maximum_discount_amount}
                onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                placeholder="50.00"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Válido Desde</label>
              <Input
                type="date"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Expira El</label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Descripción (opcional)</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descuento especial para clientes VIP"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-foreground">Activo</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_user_specific}
              onChange={(e) => setFormData({ ...formData, is_user_specific: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-foreground">Asignado a usuarios específicos</label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saveCouponMutation.isPending}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {saveCouponMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
            <Button onClick={resetForm} variant="outline" className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">No hay cupones creados</p>
        </div>
      ) : (
        coupons.map(coupon => {
          const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
          const notStarted = coupon.starts_at && new Date(coupon.starts_at) > new Date();
          const limitReached = coupon.usage_limit && coupon.used_count >= coupon.usage_limit;

          return (
            <div key={coupon.id} className="bg-card rounded-xl p-3 shadow-sm border border-border">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{coupon.code}</p>
                  <p className="text-xs text-muted-foreground">{coupon.description}</p>
                </div>
                <div className="flex gap-1">
                   <button
                     onClick={() => handleEdit(coupon)}
                     className="p-1.5 bg-secondary rounded-lg hover:bg-muted"
                   >
                     <Edit2 className="w-3 h-3 text-foreground" />
                   </button>
                   {coupon.is_user_specific && (
                     <button
                       onClick={() => setSelectedCouponForAssignment(coupon)}
                       className="p-1.5 bg-secondary rounded-lg hover:bg-primary/10"
                     >
                       <Users className="w-3 h-3 text-primary" />
                     </button>
                   )}
                   <button
                     onClick={() => setDeletingId(coupon.id)}
                     className="p-1.5 bg-secondary rounded-lg hover:bg-destructive/10"
                   >
                     <Trash2 className="w-3 h-3 text-destructive" />
                   </button>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                <div>
                  <p className="text-muted-foreground">Descuento</p>
                  <p className="text-foreground font-semibold">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Usos</p>
                  <p className="text-foreground font-semibold">
                    {coupon.used_count || 0}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <p className={`font-semibold ${!coupon.is_active ? 'text-destructive' : isExpired ? 'text-warning' : notStarted ? 'text-muted-foreground' : 'text-success'}`}>
                    {!coupon.is_active ? 'Inactivo' : isExpired ? 'Expirado' : notStarted ? 'Próximo' : 'Activo'}
                  </p>
                </div>
              </div>

              {coupon.is_user_specific && (
                <p className="text-[10px] text-muted-foreground mb-2">
                  👤 Asignado a usuarios específicos
                </p>
              )}

              {coupon.expires_at && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Expira: {new Date(coupon.expires_at).toLocaleDateString('es-SV')}
                </p>
              )}
            </div>
          );
        })
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>¿Eliminar cupón?</AlertDialogTitle>
             <AlertDialogDescription>
               Esta acción no se puede deshacer.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
               onClick={() => { deleteCouponMutation.mutate(deletingId); }}
             >
               Eliminar
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       {selectedCouponForAssignment && (
         <AdminCouponAssignments
           coupon={selectedCouponForAssignment}
           onClose={() => setSelectedCouponForAssignment(null)}
         />
       )}
      </div>
      );
      }