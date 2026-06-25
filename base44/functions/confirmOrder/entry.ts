import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // 1. Marcar orden como pagada
    const updatedOrder = await base44.asServiceRole.entities.Order.update(orderId, {
      payment_status: 'paid',
      status: 'processing',
      ...(paymentTransactionId && { payment_transaction_id: paymentTransactionId }),
    });

    // Registrar cambio de estado
    try {
      await base44.asServiceRole.entities.OrderStatusHistory.create({
        order_id: orderId,
        user_email: user?.email || order.customer_email || 'guest@shop.local',
        status: 'processing',
        timestamp: new Date().toISOString(),
        notes: 'Pago confirmado'
      });
    } catch (e) {
      console.error('Error registrando estado:', e.message);
    }

    // 2. Descontar stock y registrar InventoryLog
    for (const item of order.items) {
      try {
        if (item.variant_id) {
          const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
          const newStock = Math.max(0, (variant.stock ?? 0) - item.quantity);
          await base44.asServiceRole.entities.ProductVariant.update(item.variant_id, { stock: newStock });
          // Actualizar sold_count del producto padre
          const parentProduct = await base44.asServiceRole.entities.Product.get(item.product_id);
          await base44.asServiceRole.entities.Product.update(item.product_id, {
            sold_count: (parentProduct.sold_count || 0) + item.quantity,
          });
          await base44.asServiceRole.entities.InventoryLog.create({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: -item.quantity,
            cost_per_unit: variant.cost_per_unit || 0,
            total_cost: -item.quantity * (variant.cost_per_unit || 0),
            notes: `Venta - Orden ${order.order_number}`,
            movement_type: 'sale',
            order_id: orderId,
          });
        } else {
          const product = await base44.asServiceRole.entities.Product.get(item.product_id);
          const newStock = Math.max(0, (product.stock ?? 0) - item.quantity);
          await base44.asServiceRole.entities.Product.update(item.product_id, {
            stock: newStock,
            sold_count: (product.sold_count || 0) + item.quantity,
          });
          await base44.asServiceRole.entities.InventoryLog.create({
            product_id: item.product_id,
            quantity: -item.quantity,
            cost_per_unit: product.cost_per_unit || 0,
            total_cost: -item.quantity * (product.cost_per_unit || 0),
            notes: `Venta - Orden ${order.order_number}`,
            movement_type: 'sale',
            order_id: orderId,
          });
        }
      } catch (stockErr) {
        console.error('Error descontando stock:', stockErr);
      }
    }

    // 3. Actualizar cupón si aplica
    if (order.coupon_code) {
      try {
        const coupons = await base44.asServiceRole.entities.Coupon.filter({ code: order.coupon_code });
        if (coupons.length > 0) {
          const coupon = coupons[0];
          await base44.asServiceRole.entities.Coupon.update(coupon.id, {
            used_count: (coupon.used_count || 0) + 1,
          });
          if (coupon.is_user_specific && user?.email) {
            const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
              coupon_id: coupon.id,
              user_email: user.email
            });
            if (assignments.length > 0) {
              const a = assignments[0];
              const newCount = (a.usage_count || 0) + 1;
              const newStatus = newCount >= (coupon.usage_limit_per_user || 1) ? 'used' : 'available';
              await base44.asServiceRole.entities.CouponAssignment.update(a.id, {
                usage_count: newCount,
                status: newStatus,
                ...(newStatus === 'used' && { used_date: new Date().toISOString() }),
              });
            }
          }
        }
      } catch (couponErr) {
        console.error('Error actualizando cupón:', couponErr);
      }
    }

    // 4. Limpiar carrito
    try {
      if (user?.email) {
        const cartItems = await base44.asServiceRole.entities.CartItem.filter({ created_by: user.email });
        for (const ci of cartItems) {
          await base44.asServiceRole.entities.CartItem.delete(ci.id);
        }
      }
    } catch (cartErr) {
      console.error('Error limpiando carrito:', cartErr);
    }

    // 5. Enviar email de confirmación
    try {
      const itemsText = order.items.map(item =>
        `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} - ${item.quantity}x $${Number(item.price).toFixed(2)}`
      ).join('\n');

      await base44.integrations.Core.SendEmail({
        to: user?.email || order.customer_email,
        subject: `Confirmación de Pedido - Orden ${order.order_number}`,
        body: `Hola, ${order.customer_name || 'Estimado Cliente'}.

Gracias por tu compra. Tu pago fue recibido correctamente.

═══════════════════════════════════
Orden #${order.order_number}
═══════════════════════════════════

PRODUCTOS:
${itemsText}

Subtotal: $${Number(order.subtotal).toFixed(2)}
${order.discount_amount > 0 ? `Descuento: -$${Number(order.discount_amount).toFixed(2)}\n` : ''}Envío: $${Number(order.shipping_cost).toFixed(2)}
───────────────────────────────────
TOTAL: $${Number(order.total).toFixed(2)}
═══════════════════════════════════

Puedes ver tu orden y descargar la factura en tu cuenta en la app.

Saludos,
RAmi.`,
      });
    } catch (_) {}

    // Notificación al admin
    try {
      const itemsText = order.items.map(item =>
        `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} - ${item.quantity}x $${Number(item.price).toFixed(2)}`
      ).join('\n');
      await base44.integrations.Core.SendEmail({
        to: 'somosrami@gmail.com',
        subject: `🛒 Nuevo pedido ${order.order_number} - $${Number(order.total).toFixed(2)}`,
        body: `Nuevo pedido pagado con tarjeta.\n\nOrden: ${order.order_number}\nCliente: ${order.customer_name} (${order.customer_email})\nMétodo de pago: Tarjeta\nTotal: $${Number(order.total).toFixed(2)}\n\nProductos:\n${itemsText}\n\nDirección: ${order.shipping_address?.street}, ${order.shipping_address?.municipio}, ${order.shipping_address?.departamento}`,
      });
    } catch (_) {}

    return Response.json({ order: updatedOrder });
  } catch (error) {
    console.error('confirmOrder error:', error.message, error?.response?.status);
    return Response.json({ error: error.message, status: error?.response?.status }, { status: error?.response?.status || 500 });
  }
});