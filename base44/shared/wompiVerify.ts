/**
 * Verifica contra la API de Wompi El Salvador que existe una transacción
 * aprobada para una orden dada. Retorna la transacción aprobada o null.
 *
 * Usado por wompiWebhook (antes de confirmar el pago) y verifyWompiPayment
 * (verificación manual del admin) para evitar confirmar órdenes con
 * webhooks falsificados.
 *
 * @param order - La orden con order_number para buscar en Wompi
 * @returns La transacción aprobada { idTransaccion, ... } o null
 */
export async function getApprovedWompiTransaction(order: any): Promise<any | null> {
  const clientId = Deno.env.get('WOMPI_CLIENT_ID');
  const clientSecret = Deno.env.get('WOMPI_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Wompi no configuradas');
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
    throw new Error(`Error al autenticar con Wompi: ${tokenRes.status} ${err}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 2. Buscar enlaces de pago por nombre (que contiene el número de orden)
  const searchName = `Orden ${order.order_number}`;
  const linkListRes = await fetch(
    `https://api.wompi.sv/EnlacePago?Nombre=${encodeURIComponent(searchName)}`,
    {
      method: 'GET',
      headers: { 'authorization': `Bearer ${accessToken}` },
    }
  );

  if (!linkListRes.ok) {
    const err = await linkListRes.text();
    throw new Error(`Error al consultar enlaces de pago: ${linkListRes.status} ${err}`);
  }

  const linkListData = await linkListRes.json();
  const links = linkListData?.resultado || [];

  // 3. Buscar una transacción aprobada entre los enlaces
  for (const link of links) {
    if (link.transaccionCompra?.esAprobada) {
      return link.transaccionCompra;
    }
    if (link.transacciones?.length > 0) {
      const approved = link.transacciones.find((t: any) => t.esAprobada);
      if (approved) return approved;
    }
  }

  return null;
}