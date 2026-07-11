import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Enviar email de notificación al cliente según el nuevo estado
    const emailSubjects = {
      processing: `Tu pedido #${order.order_number} está siendo procesado`,
      shipped: `Tu pedido #${order.order_number} ha sido enviado`,
      delivered: `Tu pedido #${order.order_number} fue entregado`,
      cancelled: `Tu pedido #${order.order_number} ha sido cancelado`,
    };

    const emailBodies = {
      processing: `Hola ${order.customer_name || 'cliente'},\n\nTu pedido #${order.order_number} está siendo procesado y pronto será enviado.\n\nTotal: $${Number(order.total).toFixed(2)}\n\nGracias por tu compra.\nEl equipo`,
      shipped: `Hola ${order.customer_name || 'cliente'},\n\n¡Buenas noticias! Tu pedido #${order.order_number} ha sido enviado.${extraFields?.tracking_number ? `\n\nNúmero de seguimiento: ${extraFields.tracking_number}` : ''}${extraFields?.carrier ? `\nTransportista: ${extraFields.carrier}` : ''}\n\nPronto lo recibirás en:\n${order.shipping_address?.full_name || ''}\n${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}\n\nGracias por tu compra.\nEl equipo`,
      delivered: `Hola ${order.customer_name || 'cliente'},\n\n¡Tu pedido #${order.order_number} ha sido entregado! Esperamos que disfrutes tu compra.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\nGracias,\nEl equipo`,
      cancelled: `Hola ${order.customer_name || 'cliente'},\n\nTu pedido #${order.order_number} ha sido cancelado.\n\nSi tienes alguna pregunta sobre este proceso, contáctanos.\n\nEl equipo`,
    };

    if (emailSubjects[newStatus] && order.customer_email) {
      try {
        await base44.asServiceRole.functions.invoke('sendGmailEmail', {
          to: order.customer_email,
          subject: emailSubjects[newStatus],
          body: emailBodies[newStatus],
        });
      } catch (emailErr) {
        console.error('Error enviando email de estado:', emailErr.message);
      }
    }

    return Response.json({ order: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});