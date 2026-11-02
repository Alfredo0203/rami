import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * sendOrderEmail — centraliza los templates HTML de emails de pedidos.
 * Invoca a sendGmailEmail con el HTML ya construido.
 * Payload: { type: 'customer_confirmation' | 'admin_new_order', order }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { type, order } = await req.json();

    if (!type || !order) {
      return Response.json({ error: 'type y order son requeridos' }, { status: 400 });
    }

    const paymentLabels = {
      credit_card: 'Tarjeta',
      cash_on_delivery: 'Efectivo (contra entrega)',
      paypal: 'PayPal',
      apple_pay: 'Apple Pay',
    };

    const fmt = (n) => '$' + Number(n || 0).toFixed(2);
    const customerName = order.customer_name || 'cliente';
    const paymentLabel = paymentLabels[order.payment_method] || order.payment_method || 'N/A';

    // Filas de productos
    const itemsRows = (order.items || []).map(item =>
      `<div style="padding:8px 0;border-bottom:1px solid #e4e4e7;">
<div style="display:flex;justify-content:space-between;align-items:flex-start;">
<span style="color:#18181b;font-size:14px;font-weight:500;">${item.product_name || ''}${item.variant_name ? ' (' + item.variant_name + ')' : ''}</span>
<span style="color:#18181b;font-size:14px;font-weight:600;white-space:nowrap;">${fmt(item.price)}</span>
</div>
<span style="color:#71717a;font-size:13px;">Cantidad: ${item.quantity || 1}</span>
</div>`
    ).join('');

    const discountRow = order.discount_amount > 0
      ? `<tr><td style="padding:6px 0;">Descuento</td><td style="text-align:right;padding:6px 0;color:#16a34a;font-weight:600;">-${fmt(order.discount_amount)}</td></tr>`
      : '';

    const addr = order.shipping_address || {};
    const addressStr = [addr.full_name, addr.street, addr.house_number, addr.colonia, addr.municipio, addr.departamento, addr.country].filter(Boolean).join(', ');

    const shippingLabel = order.shipping_cost === 0 ? 'Gratis' : fmt(order.shipping_cost);

    // Versiones en texto plano (multipart/alternative mejora deliverability y evita spam)
    const itemsText = (order.items || []).map(item =>
      `- ${item.product_name || ''}${item.variant_name ? ' (' + item.variant_name + ')' : ''} - ${fmt(item.price)} x${item.quantity || 1}`
    ).join('\n');

    const customerText = `Confirmacion de Pedido

Hola ${customerName},

Hemos recibido tu pedido. Pronto lo recibiras en la direccion indicada.

Orden: #${order.order_number}

Productos:
${itemsText}

Subtotal: ${fmt(order.subtotal)}
${order.discount_amount > 0 ? `Descuento: -${fmt(order.discount_amount)}\n` : ''}Envio: ${shippingLabel}
Total: ${fmt(order.total)}

Direccion de envio: ${addressStr || 'No especificada'}

Puedes ver tu orden y descargar la factura desde tu cuenta en la app.`;

    const adminText = `Nuevo pedido recibido

Orden: #${order.order_number}
Cliente: ${customerName}
Email: ${order.customer_email || ''}
Metodo de pago: ${paymentLabel}
Total: ${fmt(order.total)}

Productos:
${itemsText}

Direccion de envio: ${addressStr || 'No especificada'}`;

    const headerBlock = `<div style="background:linear-gradient(135deg,#3894EF,#1a6cc7);padding:20px 24px;text-align:center;">
<h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">{{TITLE}}</h1>
</div>`;

    const footerBlock = `<div style="background:#f4f4f5;padding:24px;text-align:center;border-top:1px solid #e4e4e7;">
<p style="color:#71717a;font-size:13px;margin:0;">¿Necesitas ayuda? Escríbenos a <a href="mailto:somosrami@gmail.com" style="color:#3894EF;text-decoration:none;">somosrami@gmail.com</a></p>
</div>`;

    let to, subject, html, text;

    if (type === 'customer_confirmation') {
      to = order.customer_email;
      subject = `Confirmación de Pedido - Orden ${order.order_number}`;
      text = customerText;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
${headerBlock.replace('{{TITLE}}', 'Confirmación de Pedido')}
<div style="padding:32px 24px;">
<div style="text-align:center;margin:0 0 24px;">
<h2 style="color:#18181b;font-size:20px;font-weight:700;margin:0 0 8px;">¡Gracias por tu compra!</h2>
<p style="color:#71717a;font-size:14px;margin:0;">Orden #${order.order_number}</p>
</div>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 20px;">Hola ${customerName},</p>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 20px;">Hemos recibido tu pedido. Pronto lo recibirás en la dirección indicada.</p>
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Productos</p>
${itemsRows}
</div>
<table style="width:100%;font-size:14px;color:#3f3f46;border-collapse:collapse;">
<tr><td style="padding:6px 0;">Subtotal</td><td style="text-align:right;padding:6px 0;">${fmt(order.subtotal)}</td></tr>
${discountRow}
<tr><td style="padding:6px 0;">Envío</td><td style="text-align:right;padding:6px 0;">${shippingLabel}</td></tr>
<tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;">Total</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;color:#3894EF;border-top:1px solid #e4e4e7;">${fmt(order.total)}</td></tr>
</table>
<div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:20px 0;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Dirección de envío</p>
<p style="color:#18181b;font-size:14px;margin:0;line-height:1.5;">${addressStr || 'No especificada'}</p>
</div>
<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:16px 0 0;">Puedes ver tu orden y descargar la factura desde tu cuenta en la app.</p>
</div>
${footerBlock}
</div>
</body></html>`;
    } else if (type === 'admin_new_order') {
      to = 'somosrami@gmail.com';
      subject = `Nuevo pedido ${order.order_number} - ${fmt(order.total)}`;
      text = adminText;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
${headerBlock.replace('{{TITLE}}', 'Nuevo Pedido')}
<div style="padding:32px 24px;">
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 20px;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Orden</p>
<p style="color:#18181b;font-size:18px;font-weight:700;margin:0;">#${order.order_number}</p>
</div>
<table style="width:100%;font-size:14px;color:#3f3f46;border-collapse:collapse;">
<tr><td style="padding:6px 0;color:#71717a;">Cliente</td><td style="text-align:right;padding:6px 0;color:#18181b;font-weight:600;">${customerName}</td></tr>
<tr><td style="padding:6px 0;color:#71717a;">Email</td><td style="text-align:right;padding:6px 0;color:#18181b;">${order.customer_email || ''}</td></tr>
<tr><td style="padding:6px 0;color:#71717a;">Método de pago</td><td style="text-align:right;padding:6px 0;color:#18181b;">${paymentLabel}</td></tr>
<tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;">Total</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;color:#3894EF;border-top:1px solid #e4e4e7;">${fmt(order.total)}</td></tr>
</table>
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Productos</p>
${itemsRows}
</div>
<div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:20px 0;">
<p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Dirección de envío</p>
<p style="color:#18181b;font-size:14px;margin:0;line-height:1.5;">${addressStr || 'No especificada'}</p>
</div>
</div>
${footerBlock}
</div>
</body></html>`;
    } else {
      return Response.json({ error: 'Tipo de email no válido: ' + type }, { status: 400 });
    }

    await base44.asServiceRole.functions.invoke('sendGmailEmail', { to, subject, html, text });
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendOrderEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});