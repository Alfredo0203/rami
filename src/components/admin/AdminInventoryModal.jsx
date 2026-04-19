import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminInventoryModal({ product, open, onOpenChange }) {
  const [movementType, setMovementType] = useState('in'); // 'in' o 'out'
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const addInventoryMutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantity);
      const cost = parseFloat(costPerUnit);
      const finalCost = cost || (product.cost_per_unit || 0);
      const totalCost = qty * finalCost;

      // Calcular nuevo stock
      const currentStock = product.stock || 0;
      const newStock = movementType === 'in' ? currentStock + qty : currentStock - qty;

      // Validar que el stock no quede negativo
      if (newStock < 0) {
        throw new Error('El stock no puede ser negativo');
      }

      // Calcular costo promedio para entradas
      let updatedCostPerUnit = product.cost_per_unit || 0;
      if (movementType === 'in' && cost) {
        const currentTotalValue = currentStock * updatedCostPerUnit;
        const newTotalValue = currentTotalValue + totalCost;
        const newTotalStock = currentStock + qty;
        updatedCostPerUnit = newTotalStock > 0 ? newTotalValue / newTotalStock : finalCost;
      }

      // Crear registro en InventoryLog
      await base44.entities.InventoryLog.create({
        product_id: product.id,
        quantity: movementType === 'in' ? qty : -qty,
        cost_per_unit: finalCost,
        total_cost: totalCost,
        notes,
        movement_type: movementType === 'in' ? 'purchase' : 'adjustment',
      });

      // Actualizar stock del producto
      await base44.entities.Product.update(product.id, {
        stock: newStock,
        cost_per_unit: updatedCostPerUnit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(movementType === 'in' ? 'Inventario agregado' : 'Inventario retirado');
      setQuantity('');
      setCostPerUnit('');
      setNotes('');
      setMovementType('in');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al actualizar inventario');
    },
  });

  const handleSubmit = () => {
    if (!quantity || isNaN(quantity)) {
      toast.error('Completa la cantidad');
      return;
    }
    
    if (!costPerUnit || isNaN(costPerUnit)) {
      toast.error('Completa el costo unitario');
      return;
    }
    
    const qty = parseFloat(quantity);
    const currentStock = product.stock || 0;
    const newStock = movementType === 'in' ? currentStock + qty : currentStock - qty;
    
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
            Gestionar Inventario: {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Movimiento</label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span>Agregar Inventario (Entrada)</span>
                  </div>
                </SelectItem>
                <SelectItem value="out">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span>Retirar Inventario (Salida)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 10"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Stock actual: <span className="font-semibold">{product.stock || 0}</span> → 
              Nuevo stock: <span className={`font-semibold ${quantity && (movementType === 'in' ? (product.stock || 0) + parseFloat(quantity) : (product.stock || 0) - parseFloat(quantity)) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {quantity ? (movementType === 'in' ? (product.stock || 0) + parseFloat(quantity) : (product.stock || 0) - parseFloat(quantity)) : product.stock || 0}
              </span>
            </p>
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
            <p className="text-[10px] text-muted-foreground mt-1">
              💡 Para entradas: calcula costo promedio. Para salidas: usa costo actual.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={movementType === 'in' ? "Ej: Compra a proveedor" : "Ej: Producto dañado, merma"}
              className="h-20"
            />
          </div>

          {quantity && costPerUnit && (
            <div className={`rounded-lg p-2 ${movementType === 'out' ? 'bg-destructive/10' : 'bg-secondary/50'}`}>
              <p className="text-xs text-muted-foreground">
                {movementType === 'out' ? 'Reducción de' : 'Costo total:'} <span className="font-semibold">${(parseFloat(quantity) * parseFloat(costPerUnit)).toFixed(2)}</span>
              </p>
              {movementType === 'in' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Nuevo costo promedio: <span className="font-semibold text-primary">
                    ${((product.stock * product.cost_per_unit + parseFloat(quantity) * parseFloat(costPerUnit)) / (product.stock + parseFloat(quantity))).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addInventoryMutation.isPending || !quantity || !costPerUnit}
            className={movementType === 'in' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
          >
            {addInventoryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...
              </>
            ) : (
              movementType === 'in' ? 'Agregar Inventario' : 'Retirar Inventario'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}