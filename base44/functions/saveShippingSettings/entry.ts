import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { shipping_cost, free_shipping_threshold } = body;

    const existing = await base44.asServiceRole.entities.AppSettings.filter({ key: 'global' });
    const settings = existing[0];

    const patch = {
      shipping_cost: parseFloat(shipping_cost) || 0,
      free_shipping_threshold: parseFloat(free_shipping_threshold) || 0,
      updated_at: new Date().toISOString(),
      updated_by: user.email,
    };

    let result;
    if (settings?.id) {
      result = await base44.asServiceRole.entities.AppSettings.update(settings.id, patch);
    } else {
      result = await base44.asServiceRole.entities.AppSettings.create({ key: 'global', ...patch });
    }

    return Response.json({ success: true, settings: result });
  } catch (error) {
    console.error('saveShippingSettings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});