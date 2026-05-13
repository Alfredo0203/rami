import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'global' });
    const appSettings = settings[0] || {};

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const colors = {
      primary:   [41, 128, 185],   // azul para el logo RAmi
      orange:    [211, 84, 0],     // naranja para el total
      text:      [30, 30, 30],
      muted:     [100, 100, 100],
      border:    [220, 220, 220],
      white:     [255, 255, 255],
      line:      [230, 230, 230],
    };

    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;
    let y = 18;

    function fmt(v) { return `$${Number(v || 0).toFixed(2)}`; }
    function cap(v) { if (!v) return 'N/A'; return String(v).charAt(0).toUpperCase() + String(v).slice(1); }

    function t(val, x, yy, opts = {}) {
      const { size = 10, style = 'normal', color = colors.text, align = 'left', maxWidth } = opts;
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      if (maxWidth) {
        const lines = doc.splitTextToSize(String(val || ''), maxWidth);
        doc.text(lines, x, yy, { align });
        return lines.length;
      }
      doc.text(String(val || ''), x, yy, { align });
      return 1;
    }

    function drawCard(x, yy, w, h) {
      doc.setFillColor(...colors.white);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, yy, w, h, 3, 3, 'FD');
    }

    function drawLine(x1, y1, x2, y2) {
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.25);
      doc.line(x1, y1, x2, y2);
    }

    function ensureSpace(h) {
      if (y + h > pageHeight - 18) { doc.addPage(); y = 18; }
    }

    function getStatusLabel(s) {
      const map = { pending: 'Pendiente', processing: 'En proceso', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };
      return map[s] || (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : 'N/A');
    }

    function getPaymentLabel(m) {
      if (m === 'credit_card') return 'Tarjeta de Crédito';
      if (m === 'cash_on_delivery') return 'Pago contra entrega';
      if (m === 'paypal') return 'PayPal';
      if (m === 'apple_pay') return 'Apple Pay';
      return m || 'N/A';
    }

    // ─── ENCABEZADO ────────────────────────────────────────────────────────────
    // Cargar logo real desde appSettings
    async function loadImageAsDataUrl(url) {
      if (!url) { console.log('Logo URL: vacío'); return null; }
      try {
        console.log('Cargando logo desde:', url);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        console.log('Logo fetch status:', response.status, response.headers.get('content-type'));
        if (!response.ok) return null;
        const contentType = response.headers.get('content-type') || 'image/png';
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const dataUrl = `data:${contentType};base64,${btoa(binary)}`;
        console.log('Logo cargado OK, tamaño base64:', dataUrl.length);
        return dataUrl;
      } catch (e) {
        console.error('Error cargando logo:', e.message);
        return null;
      }
    }

    const logoDataUrl = await loadImageAsDataUrl(appSettings.logo_url);
    console.log('logoDataUrl presente:', !!logoDataUrl, '| logo_url en settings:', appSettings.logo_url);

    if (logoDataUrl) {
      try {
        const imgProps = doc.getImageProperties(logoDataUrl);
        console.log('imgProps:', imgProps);
        const logoH = 28;
        const logoW = (imgProps.width / imgProps.height) * logoH;
        const format = (appSettings.logo_url || '').toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
        doc.addImage(logoDataUrl, format, marginX, y - 2, logoW, logoH);
      } catch (e) {
        console.error('Error insertando imagen en PDF:', e.message);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(...colors.primary);
        doc.text('RAmi', marginX, y + 10);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(...colors.primary);
      doc.text('RAmi', marginX, y + 10);
    }

    // Info factura alineada a la derecha
    const facRight = pageWidth - marginX;
    t(`Factura #${order.order_number || 'N/A'}`, facRight, y, { size: 10, style: 'bold', align: 'right' });
    t(`Fecha: ${new Date(order.created_date).toLocaleDateString('es-SV')}`, facRight, y + 6, { size: 10, align: 'right' });
    t(`Estado: ${getStatusLabel(order.status || 'pending')}`, facRight, y + 12, { size: 10, align: 'right' });

    y += 26;

    // ─── INFORMACIÓN DEL CLIENTE ────────────────────────────────────────────────
    const addr = order.shipping_address || {};
    const phone = addr.phone || order.customer_phone || 'N/A';
    const clientCardH = 32;
    ensureSpace(clientCardH);
    drawCard(marginX, y, contentWidth, clientCardH);

    t('Información del Cliente', marginX + 5, y + 8, { size: 11, style: 'bold' });
    t(`Cliente: ${order.customer_name || 'N/A'}`, marginX + 5, y + 16, { size: 10 });
    t(`Email: ${order.customer_email || 'N/A'}`, marginX + 5, y + 22, { size: 10 });
    t(`Tel: ${phone}`, marginX + 5, y + 28, { size: 10 });

    y += clientCardH + 6;

    // ─── DETALLE DEL PEDIDO ─────────────────────────────────────────────────────
    const items = Array.isArray(order.items) ? order.items : [];

    // Calcular descuento por ítem (prorratear el descuento total)
    const subtotalCalc = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
    const totalDiscount = Number(order.discount_amount || 0);

    // Cabecera de tabla
    const colDesc    = marginX + 5;
    const colCant    = marginX + contentWidth * 0.58;
    const colPrecio  = marginX + contentWidth * 0.70;
    const colDesc2   = marginX + contentWidth * 0.82;
    const colTotal   = pageWidth - marginX - 5;

    // Medir altura total de la card
    let detailCardH = 18; // header row
    const itemLinesArr = items.map(item => {
      const name = `${item.product_name || 'Producto'}${item.variant_name ? ` - ${item.variant_name}` : ''}`;
      const lines = doc.splitTextToSize(name, colCant - colDesc - 4);
      const rowH = Math.max(10, lines.length * 5 + 4);
      detailCardH += rowH;
    });
    detailCardH += 4;

    ensureSpace(detailCardH);
    drawCard(marginX, y, contentWidth, detailCardH);

    t('Detalle del Pedido', marginX + 5, y + 8, { size: 11, style: 'bold' });

    // Header de columnas
    const headerY = y + 16;
    t('Descripción',     colDesc,   headerY, { size: 9, style: 'bold' });
    t('Cant.',           colCant,   headerY, { size: 9, style: 'bold', align: 'center' });
    t('Precio Unitario', colPrecio, headerY, { size: 9, style: 'bold', align: 'center' });
    t('Descuento',       colDesc2,  headerY, { size: 9, style: 'bold', align: 'center' });
    t('Total',           colTotal,  headerY, { size: 9, style: 'bold', align: 'right' });

    drawLine(marginX + 3, headerY + 2, pageWidth - marginX - 3, headerY + 2);

    let rowY = headerY + 7;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const lineSubtotal = unitPrice * qty;

      // Calcular descuento proporcional %
      let discountPct = 0;
      if (subtotalCalc > 0 && totalDiscount > 0) {
        discountPct = Math.round((totalDiscount / subtotalCalc) * 100);
      }
      const lineTotal = lineSubtotal - (lineSubtotal * discountPct / 100);

      const name = `${item.product_name || 'Producto'}${item.variant_name ? ` - ${item.variant_name}` : ''}`;
      const nameLines = doc.splitTextToSize(name, colCant - colDesc - 4);
      const rowH = Math.max(10, nameLines.length * 5 + 4);

      t(name,                  colDesc,   rowY + 4, { size: 9.5, maxWidth: colCant - colDesc - 4 });
      t(String(qty),           colCant,   rowY + 4, { size: 9.5, align: 'center' });
      t(fmt(unitPrice),        colPrecio, rowY + 4, { size: 9.5, align: 'center' });
      t(`${discountPct}%`,     colDesc2,  rowY + 4, { size: 9.5, align: 'center' });
      t(fmt(lineTotal),        colTotal,  rowY + 4, { size: 9.5, align: 'right' });

      rowY += rowH;
    }

    y += detailCardH + 6;

    // ─── TOTALES ────────────────────────────────────────────────────────────────
    const hasDiscount = totalDiscount > 0;
    const totalsH = hasDiscount ? 36 : 28;
    ensureSpace(totalsH);
    drawCard(marginX, y, contentWidth, totalsH);

    const tLeft = marginX + 5;
    const tRight = pageWidth - marginX - 5;
    let tY = y + 8;

    t('Subtotal:',               tLeft,  tY, { size: 10 });
    t(fmt(order.subtotal || 0),  tRight, tY, { size: 10, align: 'right' });
    tY += 7;

    t('Envio:',                         tLeft,  tY, { size: 10 });
    t(fmt(order.shipping_cost || 0),    tRight, tY, { size: 10, align: 'right' });

    if (hasDiscount) {
      tY += 7;
      t(`Descuento${order.coupon_code ? ` (${order.coupon_code})` : ''}:`, tLeft, tY, { size: 10 });
      t(`-${fmt(totalDiscount)}`, tRight, tY, { size: 10, align: 'right' });
    }

    tY += 5;
    drawLine(tLeft, tY, tRight, tY);
    tY += 7;

    t('Total',           tLeft,  tY, { size: 12, style: 'bold' });
    t(fmt(order.total || 0), tRight, tY, { size: 13, style: 'bold', color: colors.orange, align: 'right' });

    y += totalsH + 6;

    // ─── INFORMACIÓN DE ENVÍO ────────────────────────────────────────────────────
    const municipio = addr.municipio || addr.city || '';
    const departamento = addr.departamento || addr.state || '';
    const lugar = [municipio, departamento].filter(Boolean).join(', ');
    const streetLine = [addr.street, addr.house_number].filter(Boolean).join(' #');

    const envioH = 42;
    ensureSpace(envioH);
    drawCard(marginX, y, contentWidth, envioH);

    t('Información de Envio', marginX + 5, y + 8, { size: 11, style: 'bold' });
    t(`Entregar a: ${addr.full_name || order.customer_name || 'N/A'}`, marginX + 5, y + 17, { size: 10 });
    t(`Dirección: ${streetLine || 'N/A'}`, marginX + 5, y + 24, { size: 10 });
    if (lugar) t(`Lugar: ${lugar}`, marginX + 5, y + 31, { size: 10 });
    t(`Pais: ${addr.country || 'El Salvador'}`, marginX + 5, y + (lugar ? 38 : 31), { size: 10 });

    y += envioH + 6;

    // ─── INFORMACIÓN DE PAGO ─────────────────────────────────────────────────────
    const paymentH = 30;
    ensureSpace(paymentH);
    drawCard(marginX, y, contentWidth, paymentH);

    t('Información de Pago', marginX + 5, y + 8, { size: 11, style: 'bold' });
    t(`Método: ${getPaymentLabel(order.payment_method)}`, marginX + 5, y + 17, { size: 10 });

    if (order.payment_method === 'credit_card') {
      const txId = order.payment_transaction_id || '';
      // Si tenemos últimos 4 dígitos del txId
      const last4 = txId.length >= 4 ? txId.slice(-4) : '';
      if (last4) {
        t(`terminando en **** **** **** ${last4}`, marginX + 5, y + 24, { size: 10 });
      }
    } else if (order.tracking_number) {
      t(`Rastreo: ${order.tracking_number}`, marginX + 5, y + 24, { size: 10 });
    }

    y += paymentH + 8;

    // ─── FOOTER ──────────────────────────────────────────────────────────────────
    t('Gracias por tu compra', pageWidth / 2, pageHeight - 10, {
      size: 9,
      color: colors.muted,
      align: 'center',
    });

    const pdfData = doc.output('dataurlstring');
    const dateStr = new Date(order.created_date).toLocaleDateString('es-SV').replace(/\//g, '-');
    const fileName = `Factura_${order.order_number}_${dateStr}`;

    return Response.json({ success: true, pdfData, orderId: order.id, fileName });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});