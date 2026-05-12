import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { orderId, customerEmail } = body;

    if (!orderId) {
      return Response.json({ error: 'orderId requerido' }, { status: 400 });
    }

    // Verificar que la orden exista
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Validar acceso: admin o dueño del pedido
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // Usuario no autenticado - validar con email del cliente
      if (!customerEmail || customerEmail !== order.customer_email) {
        return Response.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Si está autenticado, verificar permisos
    if (user) {
      const isAdmin = user.role === 'admin';
      const isOwner = order.customer_email === user.email;
      if (!isAdmin && !isOwner) {
        return Response.json({ error: 'No tienes permiso' }, { status: 403 });
      }
    }

    // Obtener el historial
    const history = await base44.asServiceRole.entities.OrderStatusHistory.filter({
      order_id: orderId,
    });

    const sorted = history.sort((a, b) => 
      new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date)
    );

    return Response.json({ history: sorted });
  } catch (error) {
    console.error('Error in getOrderStatusHistory:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});