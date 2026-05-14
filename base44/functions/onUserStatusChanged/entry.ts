import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * onUserStatusChanged — se dispara cuando el status de un usuario cambia.
 * Envía correo al usuario si su cuenta fue suspendida.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data } = await req.json();

    // Solo actuar si el status cambió a "suspended"
    if (data?.status !== 'suspended' || old_data?.status === 'suspended') {
      return Response.json({ skipped: true });
    }

    if (!data.email) return Response.json({ skipped: true, reason: 'no email' });

    const reason = data.status_reason && data.status_reason !== 'Suspended by admin'
      ? `\n\nMotivo: ${data.status_reason}`
      : '';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: data.email,
      subject: 'Tu cuenta en RAmi ha sido suspendida',
      body: `Hola ${data.full_name || 'estimado cliente'},\n\nTu cuenta ha sido suspendida temporalmente y no podrás acceder a la tienda por el momento.${reason}\n\nSi crees que esto es un error o deseas más información, contáctanos a somosrami@gmail.com.\n\nSaludos,\nRAmi`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('onUserStatusChanged error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});