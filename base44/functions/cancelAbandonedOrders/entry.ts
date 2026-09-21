import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * cancelAbandonedOrders — ELIMINA órdenes con payment_status=pending_payment
 * que llevan más de 30 minutos sin ser pagadas.
 * Estilo Temu: si no pagaste, la orden no existe.
 * Se ejecuta cada 5 minutos vía automation programada.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // hace 30 min

    // Obtener todas las órdenes pendientes de pago (tarjeta, wompi, etc.)
    // Efectivo (cash_on_delivery) nunca debe eliminarse automáticamente
    const pendingOrders = await base44.asServiceRole.entities.Order.filter({
      payment_status: 'pending_payment',
      status: 'pending',
    });

    const abandoned = pendingOrders.filter(o =>
      o.created_date < cutoff &&
      o.payment_method !== 'cash_on_delivery'
    );

    let deleted = 0;
    for (const order of abandoned) {
      try {
        // Eliminar la orden completamente — no fue pagada, no existe
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted++;
        console.log(`Orden eliminada (no pagada): ${order.order_number}`);
      } catch (e) {
        console.error(`Error eliminando orden ${order.order_number}:`, e.message);
      }
    }

    return Response.json({ checked: pendingOrders.length, deleted });
  } catch (error) {
    console.error('cancelAbandonedOrders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});