import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Crea un enlace de pago dinámico en Wompi El Salvador
 * con el monto exacto de la orden.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { orderId, amount, orderNumber } = await req.json();

    if (!orderId || !amount) {
      return Response.json({ error: 'orderId y amount son requeridos' }, { status: 400 });
    }

    // Buscar la orden para obtener los items y construir la descripción de la compra
    let descripcionProducto = `Orden ${orderNumber || orderId}`;
    let urlImagenProducto = '';
    try {
      const order = await base44.asServiceRole.entities.Order.get(orderId);
      if (order && order.items && order.items.length > 0) {
        const itemsText = order.items
          .map((item) => `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
          .join(', ');
        descripcionProducto = itemsText.substring(0, 450);
        urlImagenProducto = order.items[0]?.product_image || '';
      }
    } catch (e) {
      console.warn('No se pudo obtener la orden para descripción:', e.message);
    }

    const clientId = Deno.env.get('WOMPI_CLIENT_ID');
    const clientSecret = Deno.env.get('WOMPI_CLIENT_SECRET');
    const appId = Deno.env.get('BASE44_APP_ID');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Credenciales de Wompi no configuradas' }, { status: 500 });
    }

    // 1. Obtener token OAuth de Wompi
    const tokenRes = await fetch('https://id.wompi.sv/connect/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: 'wompi_api',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Wompi token error:', tokenRes.status, err);
      return Response.json({ error: 'Error al autenticar con Wompi', detail: err }, { status: 502 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Construir URL de retorno/redirect — usar la URL publicada de la app
    const appUrl = 'https://fractal-nova-cart-shop.base44.app';
    const redirectUrl = `${appUrl}/OrderConfirmation?id=${orderId}&payment=success&method=wompi`;
    const returnUrl = `${appUrl}/OrderConfirmation?id=${orderId}&payment=success&method=wompi`;
    console.log('Wompi redirect URLs:', { redirectUrl, returnUrl });

    // 2. Crear enlace de pago
    const linkRes = await fetch('https://api.wompi.sv/EnlacePago', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        identificadorEnlaceComercio: `ORDER-${orderId}`,
        monto: Number(amount),
        nombreProducto: `Orden ${orderNumber || orderId}`,
        infoProducto: {
          descripcionProducto: descripcionProducto,
        },
        formaPago: {
          permitirTarjetaCreditoDebido: true,
          permitirPagoConPuntoAgricola: false,
          permitirPagoEnCuotasAgricola: false,
          permitirPagoEnBitcoin: false,
          permitePagoQuickPay: false,
        },
        configuracion: {
          urlRedirect: redirectUrl,
          urlRetorno: returnUrl,
          esMontoEditable: false,
          notificarTransaccionCliente: true,
          emailsNotificacion: 'somosrami@gmail.com',
        },
        vigencia: {
          fechaFin: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        },
        limitesDeUso: {
          cantidadMaximaPagosExitosos: 1,
        },
      }),
    });

    if (!linkRes.ok) {
      const err = await linkRes.text();
      console.error('Wompi create link error:', linkRes.status, err);
      return Response.json({ error: 'Error al crear enlace de pago Wompi', detail: err }, { status: 502 });
    }

    const linkData = await linkRes.json();
    console.log('Wompi link created:', linkData);

    return Response.json({ urlEnlace: linkData.urlEnlace });
  } catch (error) {
    console.error('createWompiPaymentLink error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});