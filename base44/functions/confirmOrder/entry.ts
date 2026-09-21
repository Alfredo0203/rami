import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { confirmOrderPayment } from '../../shared/wompiConfirm.ts';

/**
 * confirmOrder — llama después del pago exitoso (Stripe o Wompi).
 * Descuenta stock, actualiza cupones, limpia carrito y envía email.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { orderId, paymentTransactionId } = body;

    if (!orderId) return Response.json({ error: 'orderId requerido' }, { status: 400 });

    // Autenticar usuario - REQUERIDO
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    // Obtener la orden
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Orden no encontrada' }, { status: 404 });

    // Validar permisos: owner o admin/super_admin
    const isOwner = order.customer_email === user.email;
    const isAdminOrSuperAdmin = user.role === 'admin' || user.role === 'super_admin';
    
    if (!isOwner && !isAdminOrSuperAdmin) {
      return Response.json({ error: 'No tienes permiso para confirmar esta orden' }, { status: 403 });
    }

    // Si ya está pagada, no procesar de nuevo
    if (order.payment_status === 'paid') {
      return Response.json({ order });
    }

    // Delegar toda la lógica de confirmación al módulo compartido
    const updatedOrder = await confirmOrderPayment(base44, orderId, paymentTransactionId);

    return Response.json({ order: updatedOrder });
  } catch (error) {
    console.error('confirmOrder error:', error.message, error?.response?.status);
    return Response.json({ error: error.message, status: error?.response?.status }, { status: error?.response?.status || 500 });
  }
});