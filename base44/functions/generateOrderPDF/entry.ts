import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order details and app settings
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'global' });
    const appSettings = settings[0] || {};
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPosition = margin;

    // ─── Header with Logo & Company Info ───
    let logoWidth = 25;
    let logoHeight = 15;
    
    if (appSettings.logo_url) {
      try {
        doc.addImage(appSettings.logo_url, 'PNG', margin, yPosition, logoWidth, logoHeight);
      } catch (e) {
        // Logo URL invalid, skip
      }
    }
    
    doc.setFontSize(22);
    doc.setTextColor(14, 133, 140);
    doc.text('FACTURA', margin + logoWidth + 5, yPosition + 5);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    yPosition += logoHeight + 3;
    doc.setFont(undefined, 'bold');
    doc.text('RAmi', margin, yPosition);
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Tu tienda de confianza', margin, yPosition);

    // ─── Order Number & Date ───
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Orden #${order.order_number}`, margin, yPosition);
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${new Date(order.created_date).toLocaleDateString('es-SV')}`, margin, yPosition);

    // ─── Divider ───
    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // ─── Customer Info ───
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Cliente', margin, yPosition);
    yPosition += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.text(`${order.customer_name || 'N/A'}`, margin, yPosition);
    yPosition += 3.5;
    doc.text(`${order.customer_email || 'N/A'}`, margin, yPosition);
    yPosition += 3.5;
    const phoneDisplay = order.shipping_address?.phone || 'N/A';
    doc.text(`Tel: ${phoneDisplay}`, margin, yPosition);

    // ─── Shipping Address ───
    yPosition += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Dirección de Envío', margin, yPosition);
    yPosition += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    if (order.shipping_address) {
      const addr = order.shipping_address;
      doc.text(`${addr.street || ''}`, margin, yPosition);
      yPosition += 3.5;
      doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.zip_code || ''}`, margin, yPosition);
      yPosition += 3.5;
      doc.text(`${addr.country || 'El Salvador'}`, margin, yPosition);
    }

    // ─── Items Table ───
    yPosition += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Table header
    const col1 = margin;
    const col2 = pageWidth - margin - 50;
    const col3 = pageWidth - margin - 30;
    const col4 = pageWidth - margin - 12;
    
    doc.text('Producto', col1, yPosition);
    doc.text('Cant', col2, yPosition);
    doc.text('Precio', col3, yPosition);
    doc.text('Total', col4, yPosition);
    
    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 0.5, pageWidth - margin, yPosition - 0.5);
    
    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    
    let totalItems = 0;
    for (const item of order.items || []) {
      const productName = `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`;
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      const qty = item.quantity || 1;
      totalItems += qty;
      
      doc.text(productName.substring(0, 28), col1, yPosition);
      doc.text(String(qty), col2, yPosition);
      doc.text(`$${(item.price || 0).toFixed(2)}`, col3, yPosition, { align: 'right' });
      doc.text(`$${itemTotal.toFixed(2)}`, col4, yPosition, { align: 'right' });
      
      yPosition += 5.5;
    }

    // ─── Totals Section ───
    yPosition += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    
    const rightCol = pageWidth - margin - 12;
    const labelCol = pageWidth - margin - 35;
    
    // Items count
    doc.text(`Total de artículos: ${totalItems}`, margin, yPosition);
    yPosition += 4.5;
    
    // Subtotal
    doc.text('Subtotal:', labelCol, yPosition);
    doc.text(`$${(order.subtotal || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
    yPosition += 4.5;

    // Shipping
    if (order.shipping_cost > 0) {
      doc.text('Envío:', labelCol, yPosition);
      doc.text(`$${(order.shipping_cost || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
      yPosition += 4.5;
    } else {
      doc.setTextColor(76, 175, 80); // Green
      doc.text('Envío:', labelCol, yPosition);
      doc.text('GRATIS', rightCol, yPosition, { align: 'right' });
      yPosition += 4.5;
      doc.setTextColor(0, 0, 0);
    }

    // Discount
    if (order.discount_amount > 0) {
      doc.setTextColor(76, 175, 80);
      doc.text(`Desc. ${order.coupon_code || ''}:`, labelCol, yPosition);
      doc.text(`-$${(order.discount_amount || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
      yPosition += 4.5;
      doc.setTextColor(0, 0, 0);
    }

    // Total
    yPosition += 1;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(14, 133, 140);
    doc.text('TOTAL:', labelCol, yPosition);
    doc.text(`$${(order.total || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });

    // ─── Payment & Status Info ───
    yPosition += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    const paymentLabel = 
      order.payment_method === 'credit_card' ? 'Tarjeta de Crédito' :
      order.payment_method === 'cash_on_delivery' ? 'Pago contra entrega' :
      order.payment_method === 'paypal' ? 'PayPal' :
      order.payment_method === 'apple_pay' ? 'Apple Pay' : 'N/A';
    
    doc.text(`Método de Pago: ${paymentLabel}`, margin, yPosition);
    yPosition += 4;
    doc.text(`Estado: ${(order.status || 'N/A').charAt(0).toUpperCase() + (order.status || 'N/A').slice(1)}`, margin, yPosition);

    // ─── Footer ───
    yPosition = pageHeight - 12;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Gracias por comprar en RAmi. Visita www.rami.com', pageWidth / 2, yPosition, { align: 'center' });

    // Generate PDF as Data URL
    const pdfData = doc.output('dataurlstring');
    
    return Response.json({ 
      success: true,
      pdfData,
      orderId: order.id,
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});