import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Plus, X } from 'lucide-react';

export default function AdminCouponAssignments({ coupon, onClose }) {
  const [userSearchInput, setUserSearchInput] = useState('');
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['couponAssignments', coupon.id],
    queryFn: () => base44.entities.CouponAssignment.filter({ coupon_id: coupon.id }),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (userEmail) => {
      const existing = assignments.find(a => a.user_email === userEmail);
      if (existing) throw new Error('Este usuario ya está asignado');

      return base44.entities.CouponAssignment.create({
        coupon_id: coupon.id,
        user_email: userEmail,
        assigned_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponAssignments', coupon.id] });
      setUserSearchInput('');
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.CouponAssignment.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couponAssignments', coupon.id] });
    },
  });

  const assignedEmails = assignments.map(a => a.user_email);
  const filteredUsers = allUsers.filter(u =>
    u.email.toLowerCase().includes(userSearchInput.toLowerCase()) &&
    !assignedEmails.includes(u.email)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-card rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">Asignar {coupon.code}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Search y agregar usuarios */}
          <div className="relative">
            <Input
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              placeholder="Buscar usuario por email..."
              className="text-sm"
            />
            {userSearchInput && filteredUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      createAssignmentMutation.mutate(user.email);
                    }}
                    disabled={createAssignmentMutation.isPending}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground border-b border-border last:border-b-0 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {user.email}
                    {user.full_name && <span className="text-muted-foreground text-xs">({user.full_name})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de asignaciones */}
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios asignados</p>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{assignment.user_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.status === 'used' ? `Usado ${assignment.usage_count}x` : 'Disponible'}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Eliminar asignación</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que quieres remover este cupón de {assignment.user_email}?
                      </AlertDialogDescription>
                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                          disabled={deleteAssignmentMutation.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteAssignmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}