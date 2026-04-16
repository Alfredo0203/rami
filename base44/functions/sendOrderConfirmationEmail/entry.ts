import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event?.type !== 'create' || !data?.id) {
      return Response.json({ error: 'Invalid order event' }, { status: 400 });
    }

    const order = data;
    const itemsList = (order.items || [])
      .map(item => `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    const emailBody = `
Hola ${order.customer_name || 'cliente'},

¡Gracias por tu compra! Aquí está el resumen de tu pedido:

Número de orden: ${order.order_number}
Estado: ${order.status === 'pending' ? 'Pendiente de procesamiento' : order.status}

Artículos:
${itemsList}

Subtotal: $${order.subtotal?.toFixed(2) || '0.00'}
${order.discount_amount ? `Descuento: -$${order.discount_amount.toFixed(2)}\n` : ''}Envío: $${order.shipping_cost?.toFixed(2) || '0.00'}
Total: $${order.total?.toFixed(2) || '0.00'}

Método de pago: ${order.payment_method === 'credit_card' ? 'Tarjeta de crédito' : order.payment_method === 'cash_on_delivery' ? 'Efectivo contra entrega' : order.payment_method}
Pago: ${order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}

Dirección de envío:
${order.shipping_address?.full_name || ''}
${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}
${order.shipping_address?.state || ''}, ${order.shipping_address?.zip_code || ''}

Te notificaremos cuando tu pedido sea procesado y enviado.

Gracias,
El equipo
`.trim();

    await base44.integrations.Core.SendEmail({
      to: order.customer_email,
      subject: `Confirmación de pedido #${order.order_number}`,
      body: emailBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});