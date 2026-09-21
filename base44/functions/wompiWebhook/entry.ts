import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';

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

    const transactionId = body?.IdTransaccion || '';
    const base44 = createClientFromRequest(req);

    // Confirmar el pago usando la lógica compartida
    const updatedOrder = await confirmOrderPayment(base44, orderId, `wompi-${transactionId}`);
    console.log('Webhook: orden confirmada:', orderId, updatedOrder.order_number);

    return Response.json({ received: true, approved: true, orderId });
  } catch (error) {
    console.error('wompiWebhook error:', error.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}