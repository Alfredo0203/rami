import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';

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

    // Obtener token OAuth de Wompi
    const clientId = Deno.env.get('WOMPI_CLIENT_ID');
    const clientSecret = Deno.env.get('WOMPI_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Credenciales de Wompi no configuradas' }, { status: 500 });
    }

    const tokenRes = await fetch('https://id.wompi.sv/connect/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: 'wompi_api',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Wompi token error:', tokenRes.status, err);
      return Response.json({ error: 'Error al autenticar con Wompi' }, { status: 502 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Buscar enlaces de pago por nombre (que contiene el número de orden)
    // El identificador es ORDER-{orderId}, pero el nombre es "Orden {orderNumber}"
    const searchName = `Orden ${order.order_number}`;
    const linkListRes = await fetch(
      `https://api.wompi.sv/EnlacePago?Nombre=${encodeURIComponent(searchName)}`,
      {
        method: 'GET',
        headers: { 'authorization': `Bearer ${accessToken}` },
      }
    );

    if (!linkListRes.ok) {
      const err = await linkListRes.text();
      console.error('Wompi list error:', linkListRes.status, err);
      return Response.json({ error: 'Error al consultar enlaces de pago' }, { status: 502 });
    }

    const linkListData = await linkListRes.json();
    const links = linkListData?.resultado || [];

    // Buscar un enlace con transacción aprobada
    let approvedTransaction = null;
    for (const link of links) {
      // Verificar la última transacción exitosa
      if (link.transaccionCompra?.esAprobada) {
        approvedTransaction = link.transaccionCompra;
        break;
      }
      // Verificar en el listado de transacciones
      if (link.transacciones?.length > 0) {
        const approved = link.transacciones.find(t => t.esAprobada);
        if (approved) {
          approvedTransaction = approved;
          break;
        }
      }
    }

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