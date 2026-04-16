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
    const margin = 15;
    let yPosition = margin;

    // ─── Logo y Encabezado ───
    if (appSettings.logo_url) {
      try {
        doc.addImage(appSettings.logo_url, 'PNG', margin, yPosition, 35, 20);
      } catch (e) {
        // Logo URL invalid, skip
      }
    }

    // Nombre de la tienda
    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(14, 133, 140);
    doc.text('RAmi', pageWidth - margin - 40, yPosition + 3);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Tu tienda de confianza', pageWidth - margin - 40, yPosition + 10);

    yPosition += 25;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // ─── Información de la Orden ───
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`FACTURA #${order.order_number}`, margin, yPosition);
    
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${new Date(order.created_date).toLocaleDateString('es-SV')}`, margin, yPosition);
    
    yPosition += 4;
    doc.text(`Estado: ${(order.status || 'N/A').charAt(0).toUpperCase() + (order.status || 'N/A').slice(1)}`, margin, yPosition);

    yPosition += 8;

    // ─── Información del Cliente ───
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Cliente', margin, yPosition);
    
    yPosition += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(order.customer_name || 'N/A', margin, yPosition);
    
    yPosition += 3.5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Email: ${order.customer_email || 'N/A'}`, margin, yPosition);
    
    yPosition += 3.5;
    const phoneDisplay = order.shipping_address?.phone || 'N/A';
    doc.text(`Tel: ${phoneDisplay}`, margin, yPosition);

    yPosition += 8;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // ─── Productos ───
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Productos', margin, yPosition);
    yPosition += 7;

    let totalItems = 0;
    for (const item of order.items || []) {
      const productName = `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`;
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      const qty = item.quantity || 1;
      totalItems += qty;

      // Check if need new page
      if (yPosition + 20 > pageHeight - 80) {
        doc.addPage();
        yPosition = margin;
      }

      // Product image
      const imgX = margin;
      const imgY = yPosition;
      const imgSize = 16;
      
      if (item.product_image) {
        try {
          doc.addImage(item.product_image, 'JPEG', imgX, imgY, imgSize, imgSize);
        } catch (e) {
          doc.setDrawColor(220, 220, 220);
          doc.rect(imgX, imgY, imgSize, imgSize);
        }
      } else {
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX, imgY, imgSize, imgSize);
      }

      // Product name and quantity
      const infoX = imgX + imgSize + 5;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(productName, 70);
      doc.text(lines[0], infoX, imgY + 4);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Cant: ${qty}`, infoX, imgY + 10);

      // Price on the right
      const priceX = pageWidth - margin - 12;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(14, 133, 140);
      doc.text(`$${itemTotal.toFixed(2)}`, priceX, imgY + 5, { align: 'right' });

      yPosition += 20;
    }

    // ─── Totales ───
    yPosition += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    const labelX = margin;
    const priceX = pageWidth - margin - 12;

    // Total de artículos
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de artículos: ${totalItems}`, labelX, yPosition);
    yPosition += 5;

    // Subtotal
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Subtotal', labelX, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${(order.subtotal || 0).toFixed(2)}`, priceX, yPosition, { align: 'right' });
    yPosition += 5;

    // Shipping
    doc.setTextColor(100, 100, 100);
    doc.text('Envío', labelX, yPosition);
    if (order.shipping_cost > 0) {
      doc.setTextColor(0, 0, 0);
      doc.text(`$${(order.shipping_cost || 0).toFixed(2)}`, priceX, yPosition, { align: 'right' });
    } else {
      doc.setTextColor(76, 175, 80);
      doc.setFont(undefined, 'bold');
      doc.text('GRATIS', priceX, yPosition, { align: 'right' });
      doc.setFont(undefined, 'normal');
    }
    yPosition += 5;

    // Discount
    if (order.discount_amount > 0) {
      doc.setTextColor(100, 100, 100);
      doc.text(`Descuento${order.coupon_code ? ` (${order.coupon_code})` : ''}`, labelX, yPosition);
      doc.setTextColor(76, 175, 80);
      doc.text(`-$${(order.discount_amount || 0).toFixed(2)}`, priceX, yPosition, { align: 'right' });
      yPosition += 5;
    }

    // Total (grand total)
    yPosition += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Total', labelX, yPosition);
    doc.setTextColor(14, 133, 140);
    doc.setFontSize(13);
    doc.text(`$${(order.total || 0).toFixed(2)}`, priceX, yPosition, { align: 'right' });

    yPosition += 10;

    // ─── Dirección de Envío ───
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Dirección de Envío', margin, yPosition);
    yPosition += 4;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    if (order.shipping_address) {
      const addr = order.shipping_address;
      const addressLines = [];
      if (addr.street) addressLines.push(addr.street);
      if (addr.city) addressLines.push(addr.city);
      if (addr.state) addressLines.push(addr.state);
      if (addr.zip_code) addressLines.push(addr.zip_code);
      if (addr.country) addressLines.push(addr.country);
      
      const fullAddress = addressLines.join(', ');
      const addrLines = doc.splitTextToSize(fullAddress, pageWidth - (margin * 2));
      doc.text(addrLines, margin, yPosition);
      yPosition += addrLines.length * 4;
    }

    yPosition += 4;

    // ─── Método de Pago ───
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Pago', margin, yPosition);
    yPosition += 4;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    const paymentLabel = 
      order.payment_method === 'credit_card' ? 'Tarjeta de Crédito' :
      order.payment_method === 'cash_on_delivery' ? 'Pago contra entrega' :
      order.payment_method === 'paypal' ? 'PayPal' :
      order.payment_method === 'apple_pay' ? 'Apple Pay' : 'N/A';
    
    doc.text(`Método: ${paymentLabel}`, margin, yPosition);
    yPosition += 3.5;
    
    const statusLabel = 
      order.payment_status === 'paid' ? 'Pagado' :
      order.payment_status === 'pending_payment' ? 'Pendiente de pago' :
      order.payment_status === 'failed' ? 'Falló' : 'N/A';
    doc.text(`Estado: ${statusLabel}`, margin, yPosition);

    if (order.tracking_number) {
      yPosition += 4;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Seguimiento', margin, yPosition);
      yPosition += 4;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`Número: ${order.tracking_number}`, margin, yPosition);
      yPosition += 3.5;
      if (order.carrier) {
        doc.text(`Transportista: ${order.carrier}`, margin, yPosition);
      }
    }

    // ─── Footer ───
    yPosition = pageHeight - 12;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Gracias por tu compra en RAmi', pageWidth / 2, yPosition, { align: 'center' });

    // Generate PDF as Data URL
    const pdfData = doc.output('dataurlstring');
    
    // Format date for filename
    const orderDate = new Date(order.created_date);
    const dateStr = orderDate.toLocaleDateString('es-SV').replace(/\//g, '-');
    const fileName = `Orden_${order.order_number}_${dateStr}`;
    
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