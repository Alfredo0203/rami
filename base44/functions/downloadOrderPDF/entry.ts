import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get orderId from URL query params (GET request)
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) return Response.json({ error: 'Order ID required' }, { status: 400 });

    // Generate PDF using service role (public endpoint)
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