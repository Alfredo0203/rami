import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminInventoryModal({ product, open, onOpenChange }) {
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [movementType, setMovementType] = useState('adjustment'); // purchase, sale, adjustment, return
  const queryClient = useQueryClient();

  const addInventoryMutation = useMutation({
    mutationFn: async () => {
      let qty = parseFloat(quantity);
      const cost = parseFloat(costPerUnit);
      
      // Para compras/devoluciones, el costo es obligatorio. Para ajustes/ventas, opcional.
      const useExistingCost = (!cost || cost === 0) && (movementType === 'adjustment' || movementType === 'sale');
      const finalCost = useExistingCost ? (product.cost_per_unit || 0) : cost;
      const totalCost = qty * finalCost;

      // Validar que el stock no quede negativo
      const currentStock = product.stock || 0;
      const newStock = currentStock + qty;
      
      if (newStock < 0) {
        throw new Error('El stock no puede ser negativo');
      }

      // Calcular costo promedio ponderado SOLO para entradas (compras/devoluciones)
      let updatedCostPerUnit = product.cost_per_unit || 0;
      
      if (movementType === 'purchase' || movementType === 'return') {
        const currentTotalValue = currentStock * updatedCostPerUnit;
        const newTotalValue = currentTotalValue + totalCost;
        const newTotalStock = currentStock + qty;
        updatedCostPerUnit = newTotalStock > 0 ? newTotalValue / newTotalStock : finalCost;
      }

      // Crear registro en InventoryLog
      await base44.entities.InventoryLog.create({
        product_id: product.id,
        quantity: qty,
        cost_per_unit: finalCost,
        total_cost: totalCost,
        notes,
        movement_type: movementType,
      });

      // Actualizar stock del producto
      await base44.entities.Product.update(product.id, {
        stock: newStock,
        cost_per_unit: updatedCostPerUnit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(movementType === 'purchase' ? 'Inventario agregado' : 'Inventario actualizado');
      setQuantity('');
      setCostPerUnit('');
      setNotes('');
      setMovementType('adjustment');
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
    
    const qty = parseFloat(quantity);
    
    // Para compras y devoluciones, el costo es obligatorio
    if ((movementType === 'purchase' || movementType === 'return') && (!costPerUnit || isNaN(costPerUnit))) {
      toast.error('Completa el costo unitario para compras/devoluciones');
      return;
    }
    
    // Validar stock negativo
    const currentStock = product.stock || 0;
    if (currentStock + qty < 0) {
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
            Movimiento de Inventario: {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tipo de movimiento */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Movimiento</label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span>Compra (Entrada)</span>
                  </div>
                </SelectItem>
                <SelectItem value="return">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-chart-4" />
                    <span>Devolución (Entrada)</span>
                  </div>
                </SelectItem>
                <SelectItem value="adjustment">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span>Ajuste (Manual)</span>
                  </div>
                </SelectItem>
                <SelectItem value="sale">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span>Venta/Salida</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Cantidad {movementType === 'adjustment' || movementType === 'sale' ? '(negativo para restar)' : ''}
            </label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={movementType === 'purchase' ? "Ej: 10" : movementType === 'adjustment' ? "Ej: -5 (pérdida) o 3 (corrección)" : "Ej: -2"}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Stock actual: <span className="font-semibold">{product.stock || 0}</span> → 
              Nuevo stock: <span className={`font-semibold ${quantity && (product.stock || 0) + parseFloat(quantity) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {quantity ? (product.stock || 0) + parseFloat(quantity) : product.stock || 0}
              </span>
            </p>
          </div>

          {(movementType === 'purchase' || movementType === 'return') && (
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
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                movementType === 'purchase' ? "Ej: Compra a proveedor XYZ" :
                movementType === 'adjustment' ? "Ej: Producto dañado, pérdida en inventario" :
                movementType === 'sale' ? "Ej: Salida por venta" :
                "Ej: Devolución de cliente"
              }
              className="h-20"
            />
            {(movementType === 'adjustment' || movementType === 'sale') && (
              <p className="text-[10px] text-warning mt-1">
                ⚠️ Requerido para ajustes y salidas
              </p>
            )}
          </div>

          {quantity && ((movementType === 'purchase' || movementType === 'return') ? costPerUnit : true) && (
            <div className={`rounded-lg p-2 ${parseFloat(quantity) < 0 ? 'bg-destructive/10' : 'bg-secondary/50'}`}>
              <p className="text-xs text-muted-foreground">
                {parseFloat(quantity) < 0 ? 'Reducción de' : 'Costo total:'} <span className="font-semibold">${Math.abs(parseFloat(quantity) * ((costPerUnit && parseFloat(costPerUnit)) || (product.cost_per_unit || 0))).toFixed(2)}</span>
              </p>
              {movementType === 'purchase' || movementType === 'return' ? (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Nuevo costo promedio: <span className="font-semibold text-primary">
                    ${((product.stock * product.cost_per_unit + parseFloat(quantity) * parseFloat(costPerUnit)) / (product.stock + parseFloat(quantity))).toFixed(2)}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addInventoryMutation.isPending || !quantity}
            className={
              movementType === 'purchase' || movementType === 'return' ? 'bg-success hover:bg-success/90' :
              movementType === 'sale' ? 'bg-destructive hover:bg-destructive/90' :
              'bg-primary hover:bg-primary/90'
            }
          >
            {addInventoryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                {movementType === 'purchase' && 'Registrar Compra'}
                {movementType === 'return' && 'Registrar Devolución'}
                {movementType === 'adjustment' && 'Aplicar Ajuste'}
                {movementType === 'sale' && 'Registrar Salida'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}