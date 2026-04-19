import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Package, ShoppingCart, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InventoryHistoryModal({ product, open, onOpenChange }) {
  const { data: inventoryLogs = [], isLoading } = useQuery({
    queryKey: ['inventory-logs', product?.id],
    queryFn: () => base44.entities.InventoryLog.filter(
      { product_id: product?.id },
      '-created_date',
      100
    ),
    enabled: !!product && open,
  });

  const getMovementIcon = (type) => {
    switch (type) {
      case 'purchase': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'sale': return <ShoppingCart className="w-4 h-4 text-destructive" />;
      case 'adjustment': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'return': return <ArrowLeftRight className="w-4 h-4 text-chart-4" />;
      default: return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMovementLabel = (type) => {
    switch (type) {
      case 'purchase': return 'Compra';
      case 'sale': return 'Venta';
      case 'adjustment': return 'Ajuste';
      case 'return': return 'Devolución';
      default: return type;
    }
  };

  const getMovementBadgeColor = (type) => {
    switch (type) {
      case 'purchase': return 'bg-success/10 text-success';
      case 'sale': return 'bg-destructive/10 text-destructive';
      case 'adjustment': return 'bg-warning/10 text-warning';
      case 'return': return 'bg-chart-4/10 text-chart-4';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Histórico de Inventario: {product?.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : inventoryLogs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay movimientos de inventario registrados</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {inventoryLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-card rounded-lg p-3 border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMovementIcon(log.movement_type)}
                      <Badge className={getMovementBadgeColor(log.movement_type)}>
                        {getMovementLabel(log.movement_type || 'adjustment')}
                      </Badge>
                      {log.order_id && (
                        <Badge variant="outline" className="text-[10px]">
                          Orden: {log.order_id.substring(0, 8)}...
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_date), 'dd MMM yyyy, HH:mm', { locale: es })}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Cantidad</p>
                      <p className={`font-semibold ${log.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                        {log.quantity > 0 ? '+' : ''}{log.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Costo Unit.</p>
                      <p className="font-semibold">${(log.cost_per_unit || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className={`font-semibold ${log.total_cost > 0 ? 'text-success' : 'text-destructive'}`}>
                        ${Math.abs(log.total_cost || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {log.notes && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">{log.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}