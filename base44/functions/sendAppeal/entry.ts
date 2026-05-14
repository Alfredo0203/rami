import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { userEmail, userName, message } = await req.json();
    if (!message?.trim()) return Response.json({ error: 'Mensaje requerido' }, { status: 400 });

    const appealId = `APL-${Date.now()}`;
    const now = new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'long', timeStyle: 'short' });

    // Al admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'somosrami@gmail.com',
      subject: `⚠️ [${appealId}] Solicitud de apelación - ${userName || userEmail}`,
      body: `Se ha recibido una nueva solicitud de apelación para levantar la suspensión de cuenta.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nID de apelación: ${appealId}\nFecha: ${now}\nUsuario: ${userName || 'desconocido'}\nCorreo: ${userEmail}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nMensaje del usuario:\n"${message}"\n\nPuedes revisar y gestionar esta cuenta desde el panel de administración.`,
    });

    // Al usuario (confirmación)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: `[${appealId}] Hemos recibido tu solicitud de apelación - RAmi`,
      body: `Hola ${userName || 'estimado cliente'},\n\nHemos recibido correctamente tu solicitud de apelación para levantar la suspensión de tu cuenta en RAmi.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nID de apelación: ${appealId}\nFecha: ${now}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nTu mensaje:\n"${message}"\n\nNuestro equipo revisará tu caso y te contactará a este mismo correo en un plazo de 3 a 5 días hábiles.\n\nSi tienes dudas adicionales, puedes responder directamente a este correo o escribirnos a somosrami@gmail.com indicando tu ID de apelación: ${appealId}.\n\nGracias por comunicarte con nosotros.\n\nEquipo RAmi`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('sendAppeal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});