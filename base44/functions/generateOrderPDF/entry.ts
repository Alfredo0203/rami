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

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const colors = {
      primary: [255, 102, 51],      // naranja estilo app
      text: [20, 20, 20],
      muted: [110, 110, 110],
      border: [232, 232, 232],
      cardBg: [250, 250, 250],
      line: [235, 235, 235],
      white: [255, 255, 255],
    };

    const marginX = 12;
    const contentWidth = pageWidth - (marginX * 2);
    let y = 12;

    function formatCurrency(value) {
      return `$${Number(value || 0).toFixed(2)}`;
    }

    function capitalizeText(value) {
      if (!value) return 'N/A';
      return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    }

    function roundRect(x, y, w, h, r = 4, style = 'S') {
      doc.roundedRect(x, y, w, h, r, r, style);
    }

    function drawCard(x, y, w, h) {
      doc.setFillColor(...colors.white);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      roundRect(x, y, w, h, 4, 'FD');
    }

    function text(textValue, x, y, options = {}) {
      const {
        size = 10,
        style = 'normal',
        color = colors.text,
        align = 'left',
        maxWidth,
      } = options;

      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);

      if (maxWidth) {
        const lines = doc.splitTextToSize(String(textValue || ''), maxWidth);
        doc.text(lines, x, y, { align });
        return lines.length;
      }

      doc.text(String(textValue || ''), x, y, { align });
      return 1;
    }

    async function loadImageAsDataUrl(url) {
      if (!url) return null;
      try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const contentType = response.headers.get('content-type') || '';
        const bytes = new Uint8Array(await response.arrayBuffer());

        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }

        const base64 = btoa(binary);
        return `data:${contentType};base64,${base64}`;
      } catch (e) {
        return null;
      }
    }

    function getPaymentLabel(paymentMethod) {
      if (paymentMethod === 'credit_card') return 'Tarjeta de Crédito';
      if (paymentMethod === 'cash_on_delivery') return 'Pago contra entrega';
      if (paymentMethod === 'paypal') return 'PayPal';
      if (paymentMethod === 'apple_pay') return 'Apple Pay';
      return 'N/A';
    }

    function getPaymentStatusLabel(paymentStatus) {
      if (paymentStatus === 'paid') return 'Pagado';
      if (paymentStatus === 'pending_payment') return 'Pendiente de pago';
      if (paymentStatus === 'failed') return 'Falló';
      return 'N/A';
    }

    function drawDivider(x1, y1, x2, y2) {
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(0.25);
      doc.line(x1, y1, x2, y2);
    }

    function ensurePageSpace(requiredHeight) {
      if (y + requiredHeight > pageHeight - 20) {
        doc.addPage();
        y = 12;
      }
    }

    // Encabezado tipo marca / factura
    const logoDataUrl = await loadImageAsDataUrl(appSettings.logo_url);

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', marginX, y, 14, 14);
      } catch (e) {
        // ignore logo errors
      }
    } else {
      doc.setFillColor(...colors.primary);
      roundRect(marginX, y, 14, 14, 3, 'F');
      text('R', marginX + 7, y + 9.2, {
        size: 10,
        style: 'bold',
        color: colors.white,
        align: 'center',
      });
    }
/*
    text(appSettings.store_name || 'RAmi', marginX + 18, y + 5.5, {
      size: 16,
      style: 'bold',
      color: colors.text,
    }); */

    text(`Factura #${order.order_number || 'N/A'}`, pageWidth - marginX, y + 5.5, {
      size: 10,
      style: 'bold',
      color: colors.text,
      align: 'right',
    });

    text(
      `Fecha: ${new Date(order.created_date).toLocaleDateString('es-SV')}  •  Estado: ${capitalizeText(order.status || 'pendiente')}`,
      pageWidth - marginX,
      y + 11,
      {
        size: 8.5,
        color: colors.muted,
        align: 'right',
      }
    );

    y += 22;

    // Cliente
    const customerCardHeight = 24;
    ensurePageSpace(customerCardHeight);
    drawCard(marginX, y, contentWidth, customerCardHeight);

    text('Cliente', marginX + 5, y + 6, {
      size: 10,
      style: 'bold',
      color: colors.text,
    });

    text(order.customer_name || 'N/A', marginX + 5, y + 12, {
      size: 10,
      style: 'normal',
      color: colors.text,
    });

    text(order.customer_email || 'N/A', marginX + 5, y + 17, {
      size: 8.5,
      color: colors.muted,
    });

    text(order.shipping_address?.phone || 'N/A', marginX + 5, y + 21.5, {
      size: 8.5,
      color: colors.muted,
    });

    y += customerCardHeight + 6;

    // Productos
    const items = Array.isArray(order.items) ? order.items : [];
    const itemImageSize = 16;
    const productCardPadding = 5;

    let productsCardHeight = 12;
    for (const item of items) {
      const productName = `${item.product_name || 'Producto'}${item.variant_name ? ` (${item.variant_name})` : ''}`;
      const lines = doc.splitTextToSize(productName, contentWidth - 45);
      const blockHeight = Math.max(18, 8 + (lines.length * 4.2));
      productsCardHeight += blockHeight;
    }
    productsCardHeight += 4;

    ensurePageSpace(productsCardHeight);
    drawCard(marginX, y, contentWidth, productsCardHeight);

    text('Productos', marginX + 5, y + 7, {
      size: 11,
      style: 'bold',
      color: colors.text,
    });

    let innerY = y + 11;
    let totalItems = 0;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const qty = Number(item.quantity || 1);
      const itemTotal = Number(item.price || 0) * qty;
      totalItems += qty;

      const productName = `${item.product_name || 'Producto'}${item.variant_name ? ` (${item.variant_name})` : ''}`;
      const nameLines = doc.splitTextToSize(productName, contentWidth - 48);
      const rowHeight = Math.max(18, 8 + (nameLines.length * 4.2));

      const imgX = marginX + productCardPadding;
      const imgY = innerY + 1.5;

      if (item.product_image) {
        const productImageData = await loadImageAsDataUrl(item.product_image);
        if (productImageData) {
          try {
            doc.addImage(productImageData, 'JPEG', imgX, imgY, itemImageSize, itemImageSize);
          } catch (e) {
            doc.setFillColor(245, 245, 245);
            roundRect(imgX, imgY, itemImageSize, itemImageSize, 2.5, 'F');
          }
        } else {
          doc.setFillColor(245, 245, 245);
          roundRect(imgX, imgY, itemImageSize, itemImageSize, 2.5, 'F');
        }
      } else {
        doc.setFillColor(245, 245, 245);
        roundRect(imgX, imgY, itemImageSize, itemImageSize, 2.5, 'F');
      }

      const infoX = imgX + itemImageSize + 4;

      text(productName, infoX, innerY + 6, {
        size: 10,
        style: 'normal',
        color: colors.text,
        maxWidth: contentWidth - 52,
      });

      text(`Cant: ${qty}`, infoX, innerY + 11 + ((nameLines.length - 1) * 4.2), {
        size: 8.5,
        color: colors.muted,
      });

      text(formatCurrency(itemTotal), pageWidth - marginX - 5, innerY + 6, {
        size: 11,
        style: 'bold',
        color: colors.text,
        align: 'right',
      });

      innerY += rowHeight;

      if (index < items.length - 1) {
        drawDivider(marginX + 5, innerY - 1, pageWidth - marginX - 5, innerY - 1);
      }
    }

    y += productsCardHeight + 6;

    // Totales tipo tarjeta igual al resumen de app
    const totalsCardHeight = order.discount_amount > 0 ? 33 : 27;
    ensurePageSpace(totalsCardHeight);
    drawCard(marginX, y, contentWidth, totalsCardHeight);

    let totalsY = y + 8;
    const leftX = marginX + 5;
    const rightX = pageWidth - marginX - 5;

    text('Subtotal', leftX, totalsY, {
      size: 10,
      color: colors.muted,
    });
    text(formatCurrency(order.subtotal || 0), rightX, totalsY, {
      size: 10,
      color: colors.text,
      align: 'right',
    });

    totalsY += 6;

    text('Envío', leftX, totalsY, {
      size: 10,
      color: colors.muted,
    });
    text(formatCurrency(order.shipping_cost || 0), rightX, totalsY, {
      size: 10,
      color: colors.text,
      align: 'right',
    });

    if (Number(order.discount_amount || 0) > 0) {
      totalsY += 6;

      text(`Descuento${order.coupon_code ? ` (${order.coupon_code})` : ''}`, leftX, totalsY, {
        size: 10,
        color: colors.muted,
      });
      text(`-${formatCurrency(order.discount_amount || 0)}`, rightX, totalsY, {
        size: 10,
        color: colors.text,
        align: 'right',
      });
    }

    totalsY += 4;
    drawDivider(leftX, totalsY, rightX, totalsY);
    totalsY += 7;

    text('Total', leftX, totalsY, {
      size: 12,
      style: 'bold',
      color: colors.text,
    });
    text(formatCurrency(order.total || 0), rightX, totalsY, {
      size: 15,
      style: 'bold',
      color: colors.primary,
      align: 'right',
    });

    y += totalsCardHeight + 6;

    // Dirección de envío
    const addr = order.shipping_address || {};
    const addressLinesRaw = [];

    if (addr.full_name) addressLinesRaw.push(addr.full_name);
    else if (order.customer_name) addressLinesRaw.push(order.customer_name);

    if (addr.street) addressLinesRaw.push(addr.street);

    const cityStateLine = [addr.city, addr.state].filter(Boolean).join(', ');
    if (cityStateLine) addressLinesRaw.push(cityStateLine);

    const zipCountryLine = [addr.zip_code, addr.country].filter(Boolean).join(', ');
    if (zipCountryLine) addressLinesRaw.push(zipCountryLine);

    const addressTextLines = [];
    for (const line of addressLinesRaw) {
      const wrapped = doc.splitTextToSize(line, contentWidth - 10);
      for (const part of wrapped) addressTextLines.push(part);
    }

    const addressCardHeight = Math.max(24, 12 + (addressTextLines.length * 4.5));
    ensurePageSpace(addressCardHeight);
    drawCard(marginX, y, contentWidth, addressCardHeight);

    text('Dirección de Envío', marginX + 5, y + 7, {
      size: 11,
      style: 'bold',
      color: colors.text,
    });

    let addrY = y + 14;
    for (const line of addressTextLines) {
      text(line, marginX + 5, addrY, {
        size: 10,
        color: colors.text,
      });
      addrY += 4.5;
    }

    y += addressCardHeight + 6;

    // Pago
    const paymentMethodLabel = getPaymentLabel(order.payment_method);
    const paymentStatusLabel = getPaymentStatusLabel(order.payment_status);

    const paymentLines = [paymentMethodLabel];
    if (order.payment_status) paymentLines.push(`Estado: ${paymentStatusLabel}`);
    if (order.tracking_number) paymentLines.push(`Tracking: ${order.tracking_number}`);
    if (order.carrier) paymentLines.push(`Transportista: ${order.carrier}`);

    const paymentCardHeight = Math.max(22, 11 + (paymentLines.length * 4.5));
    ensurePageSpace(paymentCardHeight);
    drawCard(marginX, y, contentWidth, paymentCardHeight);

    text('Pago', marginX + 5, y + 7, {
      size: 11,
      style: 'bold',
      color: colors.text,
    });

    let payY = y + 14;
    for (let i = 0; i < paymentLines.length; i++) {
      text(paymentLines[i], marginX + 5, payY, {
        size: i === 0 ? 10 : 8.8,
        color: i === 0 ? colors.text : colors.muted,
      });
      payY += 4.5;
    }

    y += paymentCardHeight + 8;

    // Footer
    const footerY = pageHeight - 10;
    text(
      `Gracias por tu compra${appSettings.store_name ? ` en ${appSettings.store_name}` : ''}`,
      pageWidth / 2,
      footerY,
      {
        size: 8,
        color: colors.muted,
        align: 'center',
      }
    );

    const pdfData = doc.output('dataurlstring');

    const orderDate = new Date(order.created_date);
    const dateStr = orderDate.toLocaleDateString('es-SV').replace(/\//g, '-');
    const fileName = `Factura_${order.order_number}_${dateStr}`;

    return Response.json({
      success: true,
      pdfData,
      orderId: order.id,
      fileName,
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});