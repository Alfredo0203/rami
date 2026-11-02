import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();

    const mapped = (users || [])
      .map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        status: u.status,
        status_reason: u.status_reason,
        status_changed_at: u.status_changed_at,
        created_date: u.created_date,
      }))
      .sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));

    return Response.json({ users: mapped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}