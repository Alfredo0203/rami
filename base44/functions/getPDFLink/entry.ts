import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) return Response.json({ error: 'Order ID required' }, { status: 400 });

    // Get order
    const order = await base44.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Validar que el usuario sea el dueño de la orden
    if (order.created_by !== user.email) {
      return Response.json({ error: 'No tienes permiso para acceder a esta factura' }, { status: 403 });
    }

    // Generate PDF
    const pdfRes = await base44.asServiceRole.functions.invoke('generateOrderPDF', {
      orderId: order.id,
    });

    if (!pdfRes.pdfData) {
      return Response.json({ error: 'PDF generation failed' }, { status: 500 });
    }

    // Encode PDF data as data URL for email link
    const pdfDataUrl = `data:application/pdf;base64,${pdfRes.pdfData}`;

    return Response.json({
      pdfUrl: pdfDataUrl,
      fileName: pdfRes.fileName,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});