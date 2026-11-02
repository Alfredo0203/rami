/**
 * Página de regreso de Wompi.
 *
 * Wompi carga esta URL dentro de su propia vista al terminar el pago. La app
 * publicada envía `x-frame-options: DENY`, así que apuntar el regreso a una
 * ruta de la tienda (OrderConfirmation) termina en "Página web no disponible".
 * Esta función responde una página simple que sí se puede mostrar enmarcada y
 * ofrece un enlace que abre la tienda en la ventana completa (target="_top").
 *
 * La orden se confirma por el webhook de Wompi; el checkout detecta el pago y
 * navega solo, así que aquí no se necesita ninguna lógica de pago.
 */
Deno.serve((req) => {
  const origin = new URL(req.url).origin;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pago recibido - RAmi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #f7f7f7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif;
      color: #141414;
    }
    .card {
      width: 100%;
      max-width: 360px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px 24px;
      text-align: center;
    }
    .badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: #e8f5ec;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { font-size: 14px; line-height: 1.5; color: #737373; margin: 0 0 24px; }
    a {
      display: block;
      padding: 14px 20px;
      border-radius: 999px;
      background: #3994ef;
      color: #000000;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2f9e5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>¡Pago recibido!</h1>
    <p>Estamos confirmando tu pedido. Vuelve a la tienda para ver el estado y el detalle de tu compra.</p>
    <a href="${origin}/Orders" target="_top">Volver a la tienda</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
});