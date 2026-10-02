import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';
import { getApprovedWompiTransaction } from '../../shared/wompiVerify.ts';

/**
 * wompiWebhook — Recibe notificaciones de pago de Wompi El Salvador.
 * Wompi envía un POST cuando una transacción es exitosa.
 *
 * El body incluye:
 *   - ResultadoTransaccion: "ExitosaAprobada" | "ExitosaDeclinada" | "Fallida"
 *   - EnlacePago.IdentificadorEnlaceComercio: "ORDER-{orderId}"
 *   - IdTransaccion: ID de la transacción en Wompi
 *   - Monto: monto de la transacción
 *
 * SEGURIDAD: Antes de confirmar la orden, se verifica contra la API de Wompi
 * que la transacción realmente existe y está aprobada, para evitar webhooks
 * falsificados que confirmen órdenes sin pago real.
 *
 * Configurar esta URL en el panel de Wompi o al crear el enlace de pago.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    console.log('Wompi webhook received:', JSON.stringify(body));

    // Solo procesar transacciones exitosas
    const isApproved = body?.ResultadoTransaccion === 'ExitosaAprobada';
    if (!isApproved) {
      console.log('Webhook: transacción no aprobada, ignorando:', body?.ResultadoTransaccion);
      return Response.json({ received: true, approved: false });
    }

    // Extraer orderId del identificador del enlace de pago
    const identifier = body?.EnlacePago?.IdentificadorEnlaceComercio || '';
    const orderId = identifier.replace(/^ORDER-/, '');

    if (!orderId) {
      console.error('Webhook: no se pudo extraer orderId del identificador:', identifier);
      return Response.json({ error: 'Identificador inválido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Obtener la orden para verificar contra la API de Wompi
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      console.error('Webhook: orden no encontrada', orderId);
      return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Si ya está pagada, no procesar de nuevo (idempotencia)
    if (order.payment_status === 'paid') {
      return Response.json({ received: true, alreadyPaid: true, orderId });
    }

    // VERIFICACIÓN: consultar la API de Wompi para confirmar que la transacción
    // realmente existe y está aprobada (evita webhooks falsificados)
    let approvedTransaction;
    try {
      approvedTransaction = await getApprovedWompiTransaction(order);
    } catch (err) {
      console.error('Webhook: error verificando transacción en Wompi:', err.message);
      return Response.json({ error: 'Error al verificar pago en Wompi' }, { status: 502 });
    }

    if (!approvedTransaction) {
      console.error('Webhook: transacción no encontrada/aprobada en Wompi para orden', orderId);
      return Response.json({ received: true, approved: false, verified: false });
    }

    const transactionId = approvedTransaction.idTransaccion || body?.IdTransaccion || '';
    const updatedOrder = await confirmOrderPayment(base44, orderId, `wompi-${transactionId}`);
    console.log('Webhook: orden confirmada y verificada:', orderId, updatedOrder.order_number);

    return Response.json({ received: true, approved: true, verified: true, orderId });
  } catch (error) {
    console.error('wompiWebhook error:', error.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}