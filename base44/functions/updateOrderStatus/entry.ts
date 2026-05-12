import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * updateOrderStatus — cambia el estado de una orden.
 * Si se cancela (cancelled), restaura el stock de cada item.
 * Solo se puede cancelar si el pedido NO está ya entregado ni cancelado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { orderId, newStatus, extraFields } = await req.json();
    if (!orderId || !newStatus) {
      return Response.json({ error: 'orderId y newStatus son requeridos' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Orden no encontrada' }, { status: 404 });

    // No permitir cancelar si ya está entregado o ya cancelado
    if (newStatus === 'cancelled') {
      if (order.status === 'delivered') {
        return Response.json({ error: 'No se puede cancelar un pedido ya entregado' }, { status: 409 });
      }
      if (order.status === 'cancelled') {
        return Response.json({ error: 'El pedido ya está cancelado' }, { status: 409 });
      }

      // Solo restaurar stock si el stock fue efectivamente descontado:
      // - Contraentrega: siempre se descuenta en placeOrder
      // - Pago online (credit_card, wompi): solo se descuenta si payment_status === 'paid'
      const stockWasDeducted =
        order.payment_method === 'cash_on_delivery' ||
        order.payment_status === 'paid';

      if (stockWasDeducted) {
        for (const item of order.items || []) {
          try {
            if (item.variant_id) {
              const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
              if (variant) {
                await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, {
                  stock: (variant.stock ?? 0) + (item.quantity ?? 1),
                });
                await base44.asServiceRole.entities.InventoryLog.create({
                  product_id: item.product_id,
                  variant_id: item.variant_id,
                  quantity: item.quantity ?? 1,
                  cost_per_unit: 0,
                  total_cost: 0,
                  notes: `Cancelación - Orden ${order.order_number}`,
                  movement_type: 'return',
                  order_id: orderId,
                });
              }
            } else {
              const product = await base44.asServiceRole.entities.Product.get(item.product_id);
              if (product) {
                await base44.asServiceRole.entities.Product.update(item.product_id, {
                  stock: (product.stock ?? 0) + (item.quantity ?? 1),
                  sold_count: Math.max(0, (product.sold_count || 0) - (item.quantity ?? 1)),
                });
                await base44.asServiceRole.entities.InventoryLog.create({
                  product_id: item.product_id,
                  quantity: item.quantity ?? 1,
                  cost_per_unit: 0,
                  total_cost: 0,
                  notes: `Cancelación - Orden ${order.order_number}`,
                  movement_type: 'return',
                  order_id: orderId,
                });
              }
            }
          } catch (e) {
            console.error('Error restaurando stock:', e);
          }
        }
      }
    }

    const updated = await base44.asServiceRole.entities.Order.update(orderId, {
      status: newStatus,
      ...(extraFields || {}),
    });

    // Registrar en historial de estados
    const statusLabels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    
    await base44.asServiceRole.entities.OrderStatusHistory.create({
      order_id: orderId,
      user_email: order.customer_email,
      status: newStatus,
      timestamp: new Date().toISOString(),
      notes: `Estado actualizado a ${statusLabels[newStatus] || newStatus}`
    });

    return Response.json({ order: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});