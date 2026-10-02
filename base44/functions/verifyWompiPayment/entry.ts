import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';
import { getApprovedWompiTransaction } from '../../shared/wompiVerify.ts';

/**
 * verifyWompiPayment — Permite al admin verificar el estado de un pago en Wompi.
 * Consulta la API de Wompi para ver si existe una transacción aprobada para la orden.
 * Si el pago fue confirmado, marca la orden como pagada automáticamente.
 *
 * Requiere autenticación de admin.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) return Response.json({ error: 'Solo administradores' }, { status: 403 });

    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: 'orderId requerido' }, { status: 400 });

    // Obtener la orden
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Orden no encontrada' }, { status: 404 });

    // Si ya está pagada, no hay nada que verificar
    if (order.payment_status === 'paid') {
      return Response.json({ alreadyPaid: true, order });
    }

    // Verificar contra la API de Wompi
    const approvedTransaction = await getApprovedWompiTransaction(order);

    if (approvedTransaction) {
      // El pago fue confirmado en Wompi — confirmar la orden
      const transactionId = approvedTransaction.idTransaccion || '';
      const updatedOrder = await confirmOrderPayment(base44, orderId, `wompi-${transactionId}`);
      return Response.json({
        verified: true,
        approved: true,
        transactionId,
        order: updatedOrder,
      });
    }

    // No se encontró transacción aprobada
    return Response.json({
      verified: true,
      approved: false,
      message: 'No se encontró ningún pago aprobado para esta orden en Wompi',
    });
  } catch (error) {
    console.error('verifyWompiPayment error:', error.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}