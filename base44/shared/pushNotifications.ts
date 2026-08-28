/**
 * Helpers para enviar notificaciones push nativas (iOS/Android).
 *
 * Requiere un build nativo con "Add push notifications" activado.
 * Si no hay build nativo o el usuario no tiene dispositivo registrado,
 * la llamada falla silenciosamente (no rompe el flujo).
 */

const APP_URL = 'https://fractal-nova-cart-shop.base44.app';

/** Notifica a todos los admins (role admin y super_admin) */
export async function notifyAdmins(
  base44: any,
  title: string,
  content: string,
  actionPath?: string
) {
  try {
    const [admins, superAdmins] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ role: 'admin' }),
      base44.asServiceRole.entities.User.filter({ role: 'super_admin' }),
    ]);
    const allAdmins = [...admins, ...superAdmins];
    await Promise.allSettled(
      allAdmins.map((admin: any) =>
        base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: admin.id,
          title: title.slice(0, 100),
          content: content.slice(0, 500),
          ...(actionPath && {
            action_label: 'Ver',
            action_url: APP_URL + actionPath,
          }),
        })
      )
    );
  } catch (err: any) {
    console.error('notifyAdmins error:', err?.message || err);
  }
}

/** Notifica a un cliente buscando su user_id por email */
export async function notifyCustomer(
  base44: any,
  email: string,
  title: string,
  content: string,
  actionPath?: string
) {
  if (!email) return;
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) return;
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: users[0].id,
      title: title.slice(0, 100),
      content: content.slice(0, 500),
      ...(actionPath && {
        action_label: 'Ver',
        action_url: APP_URL + actionPath,
      }),
    });
  } catch (err: any) {
    console.error('notifyCustomer error:', err?.message || err);
  }
}