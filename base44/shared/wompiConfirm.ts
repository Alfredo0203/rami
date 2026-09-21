import { notifyCustomer, notifyAdmins } from './pushNotifications.ts';

/**
 * Lógica compartida para confirmar el pago de una orden.
 * Usada por confirmOrder (frontend), wompiWebhook (Wompi) y verifyWompiPayment (admin).
 *
 * @param base44 - cliente SDK (con asServiceRole disponible)
 * @param orderId - ID de la orden a confirmar
 * @param paymentTransactionId - ID de la transacción (Wompi/Stripe)
 */
export async function confirmOrderPayment(base44, orderId, paymentTransactionId) {
  const order = await base44.asServiceRole.entities.Order.get(orderId);
  if (!order) throw new Error('Orden no encontrada');

  // Si ya está pagada, no procesar de nuevo
  if (order.payment_status === 'paid') return order;

  // 1. Marcar orden como pagada y en proceso
  const updatedOrder = await base44.asServiceRole.entities.Order.update(orderId, {
    payment_status: 'paid',
    status: 'processing',
    ...(paymentTransactionId && { payment_transaction_id: paymentTransactionId }),
  });

  // Registrar cambio de estado
  try {
    await base44.asServiceRole.entities.OrderStatusHistory.create({
      order_id: orderId,
      user_email: order.customer_email || 'system',
      status: 'processing',
      timestamp: new Date().toISOString(),
      notes: 'Pago confirmado',
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
        if (coupon.is_user_specific && order.customer_email) {
          const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
            coupon_id: coupon.id,
            user_email: order.customer_email,
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
    if (order.customer_email) {
      const cartItems = await base44.asServiceRole.entities.CartItem.filter({ created_by: order.customer_email });
      for (const orderItem of order.items) {
        const matching = cartItems.find(ci =>
          ci.product_id === orderItem.product_id &&
          (ci.variant_id || null) === (orderItem.variant_id || null)
        );
        if (matching) {
          await base44.asServiceRole.entities.CartItem.delete(matching.id);
        }
      }
    }
  } catch (cartErr) {
    console.error('Error limpiando carrito:', cartErr);
  }

  // 5. Enviar email de confirmación al cliente
  try {
    await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      type: 'customer_confirmation',
      order,
    });
  } catch (e) { console.error('Error email cliente:', e.message); }

  // Email al admin
  try {
    await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      type: 'admin_new_order',
      order,
    });
  } catch (e) { console.error('Error email admin:', e.message); }

  // 6. Notificaciones push
  if (order.customer_email) {
    try {
      await notifyCustomer(
        base44,
        order.customer_email,
        '¡Pago confirmado!',
        `Tu pedido #${order.order_number} fue confirmado y está siendo procesado.`,
        '/Orders'
      );
    } catch (e) { console.error('Error push cliente:', e?.message || e); }
  }

  try {
    await notifyAdmins(
      base44,
      'Nueva orden recibida',
      `Orden #${order.order_number} • $${Number(order.total).toFixed(2)} • Pago confirmado`,
      '/Admin'
    );
  } catch (e) { console.error('Push admin error:', e?.message || e); }

  return updatedOrder;
}