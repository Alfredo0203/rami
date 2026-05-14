import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * notifyUserSuspended — envía correo al usuario cuando su cuenta es suspendida por un admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { userEmail, userName, reason } = await req.json();
    if (!userEmail) return Response.json({ error: 'userEmail requerido' }, { status: 400 });

    const reasonText = reason && reason !== 'Suspended by admin'
      ? `\n\nMotivo: ${reason}`
      : '';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: 'Tu cuenta en RAmi ha sido suspendida',
      body: `Hola ${userName || 'estimado cliente'},\n\nTu cuenta ha sido suspendida temporalmente y no podrás acceder a la tienda por el momento.${reasonText}\n\nSi crees que esto es un error o deseas más información, contáctanos a somosrami@gmail.com.\n\nSaludos,\nRAmi`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('notifyUserSuspended error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});