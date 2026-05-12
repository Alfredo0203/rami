import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, ShieldCheck, ShieldOff, Ban, CheckCircle2, Trash2, ChevronDown, ChevronUp, Package, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_STYLES = {
  active: 'bg-success/10 text-success',
  suspended: 'bg-warning/10 text-warning',
  deactivated: 'bg-destructive/10 text-destructive',
};

const ROLE_STYLES = {
  user: 'bg-secondary text-secondary-foreground',
  admin: 'bg-primary/10 text-primary',
  seller: 'bg-accent/10 text-accent',
  super_admin: 'bg-purple-100 text-purple-700',
};

const ROLE_LABELS = {
  user: 'Cliente',
  admin: 'Admin',
  seller: 'Vendedor',
  super_admin: 'Propietario',
};

export default function AdminUserCard({ targetUser, currentUser, orders = [], stores = [] }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { label, data }

  const isSelf = currentUser?.id === targetUser?.id;
  const isOwner = currentUser?.role === 'super_admin';
  const canManageStatus = (currentUser?.role === 'admin' || isOwner) && targetUser?.role !== 'super_admin';
  const isSuperAdmin = targetUser?.role === 'super_admin';

  const updateUser = useMutation({
    mutationFn: (data) => base44.entities.User.update(targetUser.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuario actualizado');
      setReason('');
    },
    onError: () => toast.error('Error al actualizar usuario'),
  });

  const userOrders = orders.filter(o => o.customer_email === targetUser.email);
  const sellerStore = targetUser.role === 'seller' ? stores.find(s => s.owner_email === targetUser.email) : null;
  const totalSpent = userOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{targetUser.full_name || 'Sin nombre'}</p>
          <p className="text-xs text-muted-foreground truncate">{targetUser.email}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_STYLES[targetUser.role] || ROLE_STYLES.user}`}>
              {ROLE_LABELS[targetUser.role] || 'Customer'}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[targetUser.status || 'active']}`}>
              {targetUser.status || 'active'}
            </span>
            {isSelf && <span className="text-[10px] text-muted-foreground">(tú)</span>}
            {sellerStore && (
              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Store className="w-2.5 h-2.5" /> {sellerStore.name}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1.5 bg-secondary rounded-lg">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 pb-3 space-y-3">
          {/* Activity summary */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1 bg-secondary/50 rounded-lg p-2 text-center">
              <Package className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-sm font-bold text-foreground">{userOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">Pedidos</p>
            </div>
            <div className="flex-1 bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-primary">${totalSpent.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Gastado</p>
            </div>
          </div>

          {/* Actions — skip for self, owners, and non-owners acting on owners */}
          {!isSelf && canManageStatus && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap gap-2">
                {(targetUser.status === 'active' || !targetUser.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-warning text-warning hover:bg-warning/10"
                    onClick={() => setConfirmAction({ label: 'Suspender', data: { status: 'suspended', status_reason: reason || 'Suspended by admin', status_changed_at: new Date().toISOString() } })}
                    disabled={updateUser.isPending}
                  >
                    <Ban className="w-3 h-3 mr-1" /> Suspender
                  </Button>
                )}
                {targetUser.status === 'suspended' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-success text-success hover:bg-success/10"
                    onClick={() => updateUser.mutate({ status: 'active', status_reason: '', status_changed_at: new Date().toISOString() })}
                    disabled={updateUser.isPending}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Reactivar
                  </Button>
                )}
                {targetUser.status !== 'deactivated' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmAction({ label: 'Desactivar', data: { status: 'deactivated', status_reason: reason || 'Deactivated by admin', status_changed_at: new Date().toISOString() } })}
                    disabled={updateUser.isPending}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Desactivar
                  </Button>
                )}
                {targetUser.status === 'deactivated' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-success text-success hover:bg-success/10"
                    onClick={() => updateUser.mutate({ status: 'active', status_reason: '', status_changed_at: new Date().toISOString() })}
                    disabled={updateUser.isPending}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Restaurar
                  </Button>
                )}
              </div>

              <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿{confirmAction?.label} usuario?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción afectará la cuenta de <strong>{targetUser.full_name || targetUser.email}</strong>. ¿Estás seguro?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => { updateUser.mutate(confirmAction.data); setConfirmAction(null); }}
                    >
                      {confirmAction?.label}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Role management — owners only, cannot assign owner role */}
          {!isSelf && isOwner && !isSuperAdmin && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <p className="w-full text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rol</p>
              {['user', 'admin', 'seller'].map(role => (
                <Button
                  key={role}
                  size="sm"
                  variant={targetUser.role === role ? 'default' : 'outline'}
                  className="text-xs h-7"
                  onClick={() => updateUser.mutate({ role })}
                  disabled={updateUser.isPending || targetUser.role === role}
                >
                  <ShieldOff className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}