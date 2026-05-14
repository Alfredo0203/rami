import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { userEmail, userName, message } = await req.json();
    if (!message?.trim()) return Response.json({ error: 'Mensaje requerido' }, { status: 400 });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'somosrami@gmail.com',
      subject: `⚠️ Apelación de cuenta - ${userName || userEmail}`,
      body: `El usuario ${userName || 'desconocido'} (${userEmail}) ha enviado una apelación:\n\n"${message}"\n\nPuedes revisar y gestionar su cuenta desde el panel de administración.`,
    });

    // Confirmar al usuario
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: 'Hemos recibido tu apelación - RAmi',
      body: `Hola ${userName || 'estimado cliente'},\n\nHemos recibido tu apelación y la revisaremos a la brevedad posible. Te contactaremos a este mismo correo con nuestra respuesta.\n\nMensaje enviado:\n"${message}"\n\nGracias por comunicarte con nosotros.\n\nEquipo RAmi`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('sendAppeal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});