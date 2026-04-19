import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Package } from 'lucide-react';

export default function AdminInventoryModal({ product, open, onOpenChange }) {
  const [realStock, setRealStock] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const addInventoryMutation = useMutation({
    mutationFn: async () => {
      const newStock = parseFloat(realStock);
      const currentStock = product.stock || 0;
      const quantityDiff = newStock - currentStock;

      // Validar que el stock no sea negativo
      if (newStock < 0) {
        throw new Error('El stock no puede ser negativo');
      }

      // Crear registro en InventoryLog
      await base44.entities.InventoryLog.create({
        product_id: product.id,
        quantity: quantityDiff,
        cost_per_unit: product.cost_per_unit || 0,
        total_cost: quantityDiff * (product.cost_per_unit || 0),
        notes: notes || 'Ajuste de inventario real',
        movement_type: 'adjustment',
      });

      // Actualizar stock del producto
      await base44.entities.Product.update(product.id, {
        stock: newStock,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Inventario actualizado');
      setRealStock('');
      setNotes('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al actualizar inventario');
    },
  });

  const handleSubmit = () => {
    if (!realStock || isNaN(realStock)) {
      toast.error('Ingresa el stock real');
      return;
    }
    
    const newStock = parseFloat(realStock);
    if (newStock < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }
    
    addInventoryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Actualizar Stock Real: {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stock Actual</label>
            <div className="text-2xl font-bold text-foreground">{product.stock || 0} unidades</div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nuevo Stock Real</label>
            <Input
              type="number"
              value={realStock}
              onChange={(e) => setRealStock(e.target.value)}
              placeholder="Ej: 50"
            />
            {realStock && !isNaN(realStock) && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Cambio: <span className={`font-semibold ${parseFloat(realStock) >= (product.stock || 0) ? 'text-success' : 'text-destructive'}`}>
                  {parseFloat(realStock) >= (product.stock || 0) ? '+' : ''}{parseFloat(realStock) - (product.stock || 0)} unidades
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Inventario físico realizado, diferencia por merma"
              className="h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addInventoryMutation.isPending || !realStock}
            className="bg-primary hover:bg-primary/90"
          >
            {addInventoryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...
              </>
            ) : (
              'Actualizar Stock Real'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}