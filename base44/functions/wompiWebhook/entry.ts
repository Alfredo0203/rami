import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';
import { getApprovedWompiTransaction } from '../../shared/wompiVerify.ts';

/**
 * wompiWebhook — Recibe notificaciones de pago de Wompi El Salvador.
 *
 * Body (según docs.wompi.sv/webhook/definicion-webhook):
 *   - ResultadoTransaccion: "ExitosaAprobada" | "ExitosaDeclinada" | "Fallida"
 *   - EnlacePago.IdentificadorEnlaceComercio: "ORDER-{orderId}"
 *   - IdTransaccion, Monto, EsProductiva
 *
 * SEGURIDAD: se valida el header `wompi_hash` (HMAC-SHA256 del body con el
 * API Secret del aplicativo), tal como indica docs.wompi.sv/webhook/validar-webhook.
 * Si la firma no viene o no coincide, se intenta verificar la transacción
 * consultando la API de Wompi antes de confirmar.
 *
 * NOTA: las transacciones hechas con el negocio en modo desarrollo NO
 * aparecen en el reporte de transacciones de la API (EsProductiva: false),
 * por eso la verificación por API solo respalda transacciones productivas.
 * Cada evento se guarda en WompiEvent para diagnóstico.
 */
async function computeHmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function(req: Request): Promise<Response> {
  let base44: any = null;
  let diagnostic: any = { outcome: 'unknown' };

  const logEvent = async (extra: Record<string, unknown> = {}) => {
    if (!base44) return;
    try {
      await base44.asServiceRole.entities.WompiEvent.create({ ...diagnostic, ...extra });
    } catch (e) {
      console.error('No se pudo registrar el evento Wompi:', e?.message || e);
    }
  };

  try {
    const raw = await req.text();
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'JSON inválido' }, { status: 400 });
    }

    base44 = createClientFromRequest(req);

    console.log('Wompi webhook received:', raw);

    const identifier = body?.EnlacePago?.IdentificadorEnlaceComercio || body?.IdentificadorEnlaceComercio || '';
    const orderId = String(identifier).replace(/^ORDER-/, '');

    // 1. Validar firma HMAC del body
    const secret = Deno.env.get('WOMPI_CLIENT_SECRET');
    const receivedHash = (req.headers.get('wompi_hash') || '').toLowerCase();
    let hashMatch = false;
    if (secret && receivedHash) {
      const expectedHash = await computeHmacHex(secret, raw);
      hashMatch = expectedHash === receivedHash;
    }

    diagnostic = {
      order_id: orderId || null,
      identificador: identifier || null,
      resultado: body?.ResultadoTransaccion || null,
      monto: Number.isFinite(Number(body?.Monto)) ? Number(body.Monto) : null,
      es_productiva: typeof body?.EsProductiva === 'boolean' ? body.EsProductiva : null,
      hash_header: receivedHash || null,
      hash_match: hashMatch,
      payload: raw.slice(0, 4000),
    };

    if (!hashMatch) {
      console.warn('Webhook: firma ausente o inválida (wompi_hash). Se intentará verificar por API.');
    }

    // Solo procesar transacciones aprobadas
    if (body?.ResultadoTransaccion !== 'ExitosaAprobada') {
      console.log('Webhook: transacción no aprobada, ignorando:', body?.ResultadoTransaccion);
      await logEvent({ outcome: 'ignored' });
      return Response.json({ received: true, approved: false });
    }

    if (!identifier || !orderId || orderId === identifier) {
      console.error('Webhook: no se pudo extraer orderId del identificador:', identifier);
      await logEvent({ outcome: 'invalid_identifier' });
      return Response.json({ error: 'Identificador inválido' }, { status: 400 });
    }

    // Obtener la orden
    let order: any = null;
    try {
      order = await base44.asServiceRole.entities.Order.get(orderId);
    } catch {
      order = null;
    }
    if (!order) {
      console.error('Webhook: orden no encontrada', orderId);
      await logEvent({ outcome: 'not_found' });
      return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Idempotencia: si ya está pagada, no procesar de nuevo
    if (order.payment_status === 'paid') {
      await logEvent({ outcome: 'already_paid' });
      return Response.json({ received: true, alreadyPaid: true, orderId });
    }

    // 2. Validar monto contra la orden
    const monto = Number(body?.Monto);
    if (Number.isFinite(monto) && Math.abs(monto - Number(order.total)) > 0.01) {
      console.error(`Webhook: monto no coincide. Orden ${order.order_number}: esperado ${order.total}, recibido ${monto}`);
      await logEvent({ outcome: 'amount_mismatch' });
      return Response.json({ error: 'Monto no coincide con la orden' }, { status: 400 });
    }

    // 3. Si la firma no es válida, exigir verificación contra la API de Wompi
    if (!hashMatch) {
      let approvedTransaction: any = null;
      try {
        approvedTransaction = await getApprovedWompiTransaction(order);
      } catch (err) {
        console.error('Webhook: error verificando transacción en Wompi:', err.message);
      }
      if (!approvedTransaction) {
        console.error('Webhook: firma inválida y transacción no verificable en Wompi para orden', orderId);
        await logEvent({ outcome: 'rejected_signature' });
        return Response.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    const transactionId = body?.IdTransaccion || '';
    const updatedOrder = await confirmOrderPayment(
      base44,
      orderId,
      transactionId ? `wompi-${transactionId}` : 'wompi',
    );
    console.log('Webhook: orden confirmada:', orderId, updatedOrder.order_number);
    await logEvent({ outcome: 'confirmed' });

    return Response.json({ received: true, approved: true, orderId });
  } catch (error) {
    console.error('wompiWebhook error:', error.message, error?.stack);
    await logEvent({ outcome: 'error', payload: String(error?.message || error) });
    return Response.json({ error: error.message }, { status: 500 });
  }
}