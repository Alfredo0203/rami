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

      // La restauración de stock la maneja la automatización onOrderCancelled
      // para evitar doble restauración.
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