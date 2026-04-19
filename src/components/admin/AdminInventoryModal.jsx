import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AdminInventoryModal({ product, open, onOpenChange }) {
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const addInventoryMutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantity);
      const cost = parseFloat(costPerUnit);
      const totalCost = qty * cost;

      // Calcular costo promedio ponderado
      const currentStock = product.stock || 0;
      const currentCost = product.cost_per_unit || 0;
      const currentTotalValue = currentStock * currentCost;
      const newTotalValue = currentTotalValue + totalCost;
      const newTotalStock = currentStock + qty;
      const averageCost = newTotalStock > 0 ? newTotalValue / newTotalStock : cost;

      // Crear registro en InventoryLog
      await base44.entities.InventoryLog.create({
        product_id: product.id,
        quantity: qty,
        cost_per_unit: cost,
        total_cost: totalCost,
        notes,
      });

      // Actualizar stock y cost_per_unit del producto con costo promedio
      await base44.entities.Product.update(product.id, {
        stock: newTotalStock,
        cost_per_unit: averageCost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Inventario agregado');
      setQuantity('');
      setCostPerUnit('');
      setNotes('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Error al agregar inventario');
    },
  });

  const handleSubmit = () => {
    if (!quantity || !costPerUnit || isNaN(quantity) || isNaN(costPerUnit)) {
      toast.error('Completa cantidad y costo');
      return;
    }
    addInventoryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Inventario: {product?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Costo Unitario</label>
            <Input
              type="number"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="Ej: 5.50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Compra a proveedor X"
              className="h-20"
            />
          </div>

          {quantity && costPerUnit && (
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">
                Costo total: ${(parseFloat(quantity) * parseFloat(costPerUnit)).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addInventoryMutation.isPending}
            className="bg-primary"
          >
            {addInventoryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Agregando...
              </>
            ) : (
              'Agregar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}