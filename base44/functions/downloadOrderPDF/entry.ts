import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    // Get orderId from URL query params (GET request)
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) return Response.json({ error: 'Order ID required' }, { status: 400 });

    // Get order and validate ownership
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    if (order.created_by !== user.email) {
      return Response.json({ error: 'No tienes permiso para descargar esta factura' }, { status: 403 });
    }

    // Generate PDF using service role
    const pdfRes = await base44.asServiceRole.functions.invoke('generateOrderPDF', {
      orderId,
    });

    if (!pdfRes.pdfData) {
      return Response.json({ error: 'PDF generation failed' }, { status: 500 });
    }

    // Convert base64 to binary
    const binaryString = atob(pdfRes.pdfData.split(',')[1] || pdfRes.pdfData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Response(bytes.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfRes.fileName}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});