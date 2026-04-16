import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import OrderStatusBadge from '../shop/OrderStatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Estados desde los que NO se puede cancelar
const NON_CANCELLABLE = ['delivered', 'cancelled'];

export default function AdminOrderCard({ order }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ newStatus, extraFields }) => {
      const res = await base44.functions.invoke('updateOrderStatus', {
        orderId: order.id,
        newStatus,
        extraFields,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Pedido actualizado');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Error al actualizar el pedido');
    },
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'cancelled' && NON_CANCELLABLE.includes(order.status)) {
      toast.error('No se puede cancelar un pedido ya entregado o cancelado');
      return;
    }

    const extraFields = {};
    if (newStatus === 'shipped' && !order.tracking_number) {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      extraFields.tracking_number = 'RA-' + ts + rand;
    }

    updateMutation.mutate({ newStatus, extraFields });
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy') : ''} · {order.customer_name || order.customer_email}
          </p>
        </div>
        <span className="text-sm font-extrabold text-primary">${order.total?.toFixed(2)}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg p-2 min-w-fit">
            <img src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60'} alt="" className="w-8 h-8 rounded object-cover" />
            <div>
              <p className="text-xs font-medium text-foreground truncate max-w-[100px]">{item.product_name}</p>
              <p className="text-[10px] text-muted-foreground">×{item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={order.status}
          onValueChange={handleStatusChange}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="processing">En proceso</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            {/* Solo mostrar cancelado si aún se puede cancelar */}
            {!NON_CANCELLABLE.includes(order.status) && (
              <SelectItem value="cancelled">Cancelado</SelectItem>
            )}
            {order.status === 'cancelled' && (
              <SelectItem value="cancelled">Cancelado</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Input
          placeholder="Nº de rastreo"
          defaultValue={order.tracking_number || ''}
          onBlur={(e) => {
            if (e.target.value !== (order.tracking_number || '')) {
              updateMutation.mutate({ newStatus: order.status, extraFields: { tracking_number: e.target.value } });
            }
          }}
          className="h-8 text-xs flex-1"
        />
      </div>
    </div>
  );
}