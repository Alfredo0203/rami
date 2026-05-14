import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { token } = body;

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    // Verify token and expiry
    if (user.reactivation_token !== token) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (!user.reactivation_token_expires || new Date(user.reactivation_token_expires) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 400 });
    }

    // Reactivate account
    await base44.asServiceRole.entities.User.update(user.id, {
      status: 'active',
      status_reason: null,
      status_changed_at: null,
      reactivation_token: null,
      reactivation_token_expires: null,
    });

    // Correo de confirmación al usuario
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '¡Tu cuenta en RAmi ha sido reactivada!',
        body: `Hola ${user.full_name || 'estimado cliente'},\n\nTu cuenta ha sido reactivada exitosamente. Ya puedes iniciar sesión y seguir comprando.\n\nSaludos,\nRAmi`,
      });
    } catch (e) { console.error('Error enviando correo de reactivación:', e); }

    return Response.json({ message: 'Account reactivated successfully' });
  } catch (error) {
    console.error('reactivateAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});