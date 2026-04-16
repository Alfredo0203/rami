import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order details
    const order = await base44.asServiceRole.entities.Order.get(orderId);
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
    const margin = 15;
    let yPosition = margin;

    // ─── Header with Logo & Company Info ───
    doc.setFontSize(24);
    doc.setTextColor(14, 133, 140); // Primary color
    doc.text('FACTURA', margin, yPosition);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    yPosition += 12;
    doc.text('TuTienda Online', margin, yPosition);
    yPosition += 5;
    doc.text('www.tutienda.com', margin, yPosition);

    // ─── Order Number & Date ───
    yPosition += 10;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Número de Orden: ${order.order_number}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Fecha: ${new Date(order.created_date).toLocaleDateString('es-SV')}`, margin, yPosition);

    // ─── Divider ───
    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // ─── Customer Info ───
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Cliente', margin, yPosition);
    yPosition += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Nombre: ${order.customer_name || 'N/A'}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Email: ${order.customer_email || 'N/A'}`, margin, yPosition);

    // ─── Shipping Address ───
    yPosition += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Dirección de Envío', margin, yPosition);
    yPosition += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    if (order.shipping_address) {
      const addr = order.shipping_address;
      doc.text(`${addr.street || ''}`, margin, yPosition);
      yPosition += 4;
      doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.zip_code || ''}`, margin, yPosition);
      yPosition += 4;
      doc.text(`${addr.country || 'El Salvador'}`, margin, yPosition);
    }

    // ─── Items Table ───
    yPosition += 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    
    // Table header
    const col1 = margin;
    const col2 = pageWidth - margin - 60;
    const col3 = pageWidth - margin - 40;
    const col4 = pageWidth - margin - 15;
    
    doc.text('Producto', col1, yPosition);
    doc.text('Cantidad', col2, yPosition);
    doc.text('Precio', col3, yPosition);
    doc.text('Total', col4, yPosition);
    
    yPosition += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
    
    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    for (const item of order.items || []) {
      const productName = `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`;
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      
      doc.text(productName.substring(0, 30), col1, yPosition);
      doc.text(String(item.quantity || 1), col2, yPosition, { align: 'center' });
      doc.text(`$${(item.price || 0).toFixed(2)}`, col3, yPosition, { align: 'right' });
      doc.text(`$${itemTotal.toFixed(2)}`, col4, yPosition, { align: 'right' });
      
      yPosition += 6;
    }

    // ─── Totals Section ───
    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const rightCol = pageWidth - margin - 20;
    
    // Subtotal
    doc.text('Subtotal:', col3, yPosition);
    doc.text(`$${(order.subtotal || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
    yPosition += 6;

    // Shipping
    if (order.shipping_cost > 0) {
      doc.text('Envío:', col3, yPosition);
      doc.text(`$${(order.shipping_cost || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
      yPosition += 6;
    } else {
      doc.setTextColor(76, 175, 80); // Green
      doc.text('Envío:', col3, yPosition);
      doc.text('GRATIS', rightCol, yPosition, { align: 'right' });
      yPosition += 6;
      doc.setTextColor(0, 0, 0);
    }

    // Discount
    if (order.discount_amount > 0) {
      doc.setTextColor(76, 175, 80);
      doc.text(`Descuento (${order.coupon_code || ''}):`, col3, yPosition);
      doc.text(`-$${(order.discount_amount || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });
      yPosition += 6;
      doc.setTextColor(0, 0, 0);
    }

    // Total
    yPosition += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(14, 133, 140);
    doc.text('TOTAL:', col3, yPosition);
    doc.text(`$${(order.total || 0).toFixed(2)}`, rightCol, yPosition, { align: 'right' });

    // ─── Payment & Status Info ───
    yPosition += 12;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    
    doc.text(`Método de Pago: ${(order.payment_method || 'N/A').replace('_', ' ').toUpperCase()}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Estado: ${(order.status || 'N/A').toUpperCase()}`, margin, yPosition);

    // ─── Footer ───
    yPosition = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gracias por tu compra. Para más información, visita www.tutienda.com', pageWidth / 2, yPosition, { align: 'center' });

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