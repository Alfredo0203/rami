import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { notifyAdmins } from '../../shared/pushNotifications.ts';

/**
 * placeOrder — valida stock, crea la orden y descuenta inventario.
 *
 * Regla de stock unificada:
 *   - Si el item tiene variant_id → descuenta ProductVariant.stock
 *   - Si no tiene variant_id      → descuenta Product.stock
 *
 * Esto hace que "dos stocks" nunca convivan en el mismo producto:
 * un producto con variantes usa el stock de sus variantes;
 * uno sin variantes usa su propio stock base.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { cartItems, shippingAddress, paymentMethod, couponCode, skipCartClear } = body;

    if (!cartItems?.length) return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    if (!shippingAddress) return Response.json({ error: 'Dirección de envío requerida' }, { status: 400 });
    if (!paymentMethod) return Response.json({ error: 'Método de pago requerido' }, { status: 400 });

    // ── 1. Validar stock para cada item ──────────────────────────────
    const stockErrors = [];

    for (const item of cartItems) {
      if (item.variant_id) {
        const variant = await base44.asServiceRole.entities.ProductVariant.get(item.variant_id);
        if (!variant) { stockErrors.push(`Producto no encontrado: ${item.product_name}`); continue; }
        if ((variant.stock ?? 0) < item.quantity) {
          stockErrors.push(
            `"${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}" solo tiene ${variant.stock ?? 0} unidades disponibles.`
          );
        }
      } else {
        const product = await base44.asServiceRole.entities.Product.get(item.product_id);
        if (!product) { stockErrors.push(`Producto no encontrado: ${item.product_name}`); continue; }
        if ((product.stock ?? 0) < item.quantity) {
          stockErrors.push(
            `"${item.product_name}" solo tiene ${product.stock ?? 0} unidades disponibles.`
          );
        }
      }
    }

    if (stockErrors.length > 0) {
      return Response.json({ error: 'Stock insuficiente', details: stockErrors }, { status: 409 });
    }

    // ── 2. Calcular totales ───────────────────────────────────────────
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price || 0) * (item.quantity || 0), 0);

    // Obtener configuración de envío desde AppSettings
    let shippingCostCfg = 0;
    let freeShippingThresholdCfg = 0;
    try {
      const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'global' });
      if (settings[0]) {
        shippingCostCfg = settings[0].shipping_cost ?? 0;
        freeShippingThresholdCfg = settings[0].free_shipping_threshold ?? 0;
      }
    } catch (e) { console.error('Error fetching settings:', e); }

    const shipping = (shippingCostCfg === 0 || (freeShippingThresholdCfg > 0 && subtotal >= freeShippingThresholdCfg)) ? 0 : shippingCostCfg;

    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupons = await base44.asServiceRole.entities.Coupon.filter({ 
        code: couponCode.toUpperCase(), 
        is_active: true 
      });
      
      if (coupons.length === 0) {
        return Response.json({ error: 'Cupón no válido' }, { status: 400 });
      }
      
      const coupon = coupons[0];
      const now = new Date();
      
      // Validar fechas
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return Response.json({ error: 'Este cupón aún no está disponible' }, { status: 400 });
      }
      
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return Response.json({ error: 'Este cupón ha expirado' }, { status: 400 });
      }
      
      // Validar monto mínimo
      if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
        return Response.json({ 
          error: `Compra mínima requerida: $${coupon.minimum_order_amount.toFixed(2)}` 
        }, { status: 400 });
      }
      
      // Validar límite total de usos
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return Response.json({ error: 'Este cupón ya no está disponible' }, { status: 400 });
      }
      
      // Validar si es específico de usuarios
      if (coupon.is_user_specific) {
        const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
          coupon_id: coupon.id,
          user_email: user.email
        });
        
        if (assignments.length === 0) {
          return Response.json({ 
            error: 'Este cupón no está disponible para tu cuenta' 
          }, { status: 400 });
        }
        
        const assignment = assignments[0];
        if (coupon.usage_limit_per_user && assignment.usage_count >= coupon.usage_limit_per_user) {
          return Response.json({ 
            error: 'Ya has usado este cupón el máximo de veces permitidas' 
          }, { status: 400 });
        }
      }
      
      // Calcular descuento
      if (coupon.discount_type === 'percentage') {
        discountAmount = subtotal * (coupon.discount_value / 100);
        if (coupon.maximum_discount_amount) {
          discountAmount = Math.min(discountAmount, coupon.maximum_discount_amount);
        }
      } else {
        discountAmount = coupon.discount_value;
      }
      
      appliedCoupon = coupon;
    }

    const total = Math.max(0, subtotal - discountAmount + shipping);

    // Genera número de orden único: timestamp en base36 + 6 chars aleatorios
    const uniqueId = () => {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      return ts + rand;
    };
    const orderNumber = 'ORD-' + uniqueId();
    // tracking_number se genera automáticamente cuando el admin cambia estado a "shipped"

    // ── 3. Crear la orden ─────────────────────────────────────────────
     // Validate each item before creating order
     const cleanedItems = cartItems.map(item => {
       // Only include the exact fields Order schema expects
       return {
         product_id: item.product_id || '',
         product_name: item.product_name || '',
         product_image: item.product_image || '',
         price: Number(item.product_price) || 0,
         quantity: Number(item.quantity) || 1,
         ...(item.variant_id && { variant_id: item.variant_id }),
         ...(item.variant_name && { variant_name: item.variant_name }),
         ...(item.original_price && { original_price: Number(item.original_price) }),
       };
     });

     const order = await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        items: cleanedItems,
       subtotal: Number(subtotal) || 0,
       discount_amount: Number(discountAmount) || 0,
       coupon_code: appliedCoupon?.code || undefined,
       shipping_cost: Number(shipping) || 0,
       total: Number(total) || 0,
       status: 'pending',
       payment_status: 'pending_payment',
       payment_method: paymentMethod,
       shipping_address: shippingAddress,
       customer_email: user.email || '',
       customer_name: user.full_name || shippingAddress.full_name || '',
     });

     // Registrar estado inicial en historial
     try {
       await base44.asServiceRole.entities.OrderStatusHistory.create({
         order_id: order.id,
         user_email: user.email,
         status: 'pending',
         timestamp: new Date().toISOString(),
         notes: 'Pedido creado automáticamente'
       });
     } catch (historyErr) {
       console.error('Error creating history record:', historyErr);
     }

     // Notificación push al admin: nueva orden recibida
     try {
      await notifyAdmins(
        base44,
        'Nueva orden recibida',
        `Orden #${order.order_number} • $${Number(order.total).toFixed(2)} • ${paymentMethod === 'cash_on_delivery' ? 'Contra entrega' : 'Pago en línea'}`,
        '/Admin'
      );
     } catch (e) { console.error('Push admin error:', e?.message || e); }

    // ── 4. Para pagos en línea (credit_card, wompi), el stock/cupón/carrito
    //     se confirman en confirmOrder tras el pago exitoso.
    //     Para contra entrega, confirmar aquí directamente.
    if (paymentMethod === 'cash_on_delivery') {
      // Descontar stock
      for (const item of cartItems) {
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
              product_id: item.product_id, variant_id: item.variant_id,
              quantity: -item.quantity, cost_per_unit: variant.cost_per_unit || 0,
              total_cost: -item.quantity * (variant.cost_per_unit || 0),
              notes: `Venta - Orden ${order.order_number}`, movement_type: 'sale', order_id: order.id,
            });
          } else {
            const product = await base44.asServiceRole.entities.Product.get(item.product_id);
            const newStock = Math.max(0, (product.stock ?? 0) - item.quantity);
            await base44.asServiceRole.entities.Product.update(item.product_id, {
              stock: newStock, sold_count: (product.sold_count || 0) + item.quantity,
            });
            await base44.asServiceRole.entities.InventoryLog.create({
              product_id: item.product_id, quantity: -item.quantity,
              cost_per_unit: product.cost_per_unit || 0,
              total_cost: -item.quantity * (product.cost_per_unit || 0),
              notes: `Venta - Orden ${order.order_number}`, movement_type: 'sale', order_id: order.id,
            });
          }
        } catch (e) { console.error('Stock error:', e); }
      }

      // Actualizar cupón
      if (appliedCoupon) {
        await base44.asServiceRole.entities.Coupon.update(appliedCoupon.id, {
          used_count: (appliedCoupon.used_count || 0) + 1,
        });
        if (appliedCoupon.is_user_specific) {
          const assignments = await base44.asServiceRole.entities.CouponAssignment.filter({
            coupon_id: appliedCoupon.id, user_email: user.email
          });
          if (assignments.length > 0) {
            const a = assignments[0];
            const newCount = (a.usage_count || 0) + 1;
            const newStatus = newCount >= (appliedCoupon.usage_limit_per_user || 1) ? 'used' : 'available';
            await base44.asServiceRole.entities.CouponAssignment.update(a.id, {
              usage_count: newCount, status: newStatus,
              ...(newStatus === 'used' && { used_date: new Date().toISOString() }),
            });
          }
        }
      }

      // Limpiar carrito
      for (const item of cartItems) {
        if (!item.id) continue;
        try { await base44.asServiceRole.entities.CartItem.delete(item.id); } catch (_) {}
      }

      // Email al cliente
      try {
        await base44.asServiceRole.functions.invoke('sendOrderEmail', {
          type: 'customer_confirmation',
          order,
        });
      } catch (e) { console.error('Error email cliente:', e.message); }

      // Notificación al admin
      try {
        await base44.asServiceRole.functions.invoke('sendOrderEmail', {
          type: 'admin_new_order',
          order,
        });
      } catch (e) { console.error('Error email admin:', e.message); }
    }

    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});