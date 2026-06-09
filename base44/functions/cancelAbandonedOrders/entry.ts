import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * cancelAbandonedOrders — cancela órdenes con payment_status=pending_payment
 * que llevan más de 30 minutos sin ser pagadas.
 * Se ejecuta cada 5 minutos vía automation programada.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // hace 30 min

    // Obtener órdenes pendientes de pago de TARJETA solamente
    // Efectivo (cash_on_delivery) nunca debe cancelarse automáticamente
    const pendingOrders = await base44.asServiceRole.entities.Order.filter({
      payment_status: 'pending_payment',
      status: 'pending',
      payment_method: 'credit_card',
    });

    const abandoned = pendingOrders.filter(o => o.created_date < cutoff);

    let cancelled = 0;
    for (const order of abandoned) {
      try {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'cancelled',
          payment_status: 'failed',
          internal_notes: `Cancelada automáticamente por falta de pago (${new Date().toISOString()})`,
        });

        // Registrar en historial
        await base44.asServiceRole.entities.OrderStatusHistory.create({
          order_id: order.id,
          user_email: order.customer_email || '',
          status: 'cancelled',
          timestamp: new Date().toISOString(),
          notes: 'Cancelada automáticamente: pago no completado en 30 minutos',
        });

        cancelled++;
        console.log(`Orden cancelada: ${order.order_number}`);
      } catch (e) {
        console.error(`Error cancelando orden ${order.order_number}:`, e.message);
      }
    }

    return Response.json({ checked: pendingOrders.length, cancelled });
  } catch (error) {
    console.error('cancelAbandonedOrders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});