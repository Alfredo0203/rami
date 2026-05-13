import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.status !== 'deactivated') {
      return Response.json({ error: 'Account is not deactivated' }, { status: 400 });
    }

    // Generate reactivation token (expires in 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update user with reactivation token
    await base44.asServiceRole.entities.User.update(user.id, {
      reactivation_token: token,
      reactivation_token_expires: expiresAt,
    });

    // Send email with reactivation link
    const reactivationUrl = `${req.headers.get('origin')}/reactivate?token=${token}`;
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Reactivar tu cuenta en RAmi',
      body: `Hola ${user.full_name || 'estimado cliente'},

Recibimos tu solicitud para reactivar tu cuenta. Haz clic en el siguiente enlace para reactivarla:

${reactivationUrl}

Este enlace expira en 24 horas.

Si no solicitaste esto, puedes ignorar este correo.

Saludos,
RAmi`,
    });

    return Response.json({ 
      message: 'Reactivation email sent. Check your inbox.',
      expiresAt 
    });
  } catch (error) {
    console.error('requestAccountReactivation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});