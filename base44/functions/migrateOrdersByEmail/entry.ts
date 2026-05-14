import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Revisa y corrige TODAS las órdenes para asegurar que created_by sea consistente.
 * Si una orden tiene customer_email pero created_by está incorrecto, la recrea con el owner correcto.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Solo admin puede ejecutar esto
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todas las órdenes
    const orders = await base44.asServiceRole.entities.Order.list('', 1000);
    
    const corrected = [];
    const issues = [];
    const summary = {
      total: orders.length,
      with_issues: 0,
      corrected: 0,
    };

    for (const order of orders) {
      // Determinar cuál es el email correcto del usuario
      const correctEmail = order.customer_email || order.created_by;

      // Si created_by está vacío o no es un email válido, pero customer_email está bien
      const createdByIsInvalid = !order.created_by || 
                                  !order.created_by.includes('@') || 
                                  order.created_by === 'system' ||
                                  order.created_by !== order.customer_email;

      if (createdByIsInvalid && correctEmail && correctEmail.includes('@')) {
        try {
          // Necesitamos recrear la orden con el created_by correcto
          // Primero deletear la antigua
          const oldData = { ...order };
          delete oldData.id;
          delete oldData.created_date;
          delete oldData.updated_date;
          delete oldData.created_by;

          // Recrear con el nuevo owner
          const newOrder = await base44.asServiceRole.entities.Order.create(oldData);
          
          // Copiar campos del sistema de la orden antigua
          await base44.asServiceRole.entities.Order.update(newOrder.id, {
            // Mantener los datos importantes
            order_number: order.order_number,
          });

          // Eliminar la antigua
          await base44.asServiceRole.entities.Order.delete(order.id);

          corrected.push({
            old_id: order.id,
            new_id: newOrder.id,
            order_number: order.order_number,
            old_created_by: order.created_by,
            new_created_by: correctEmail,
            status: 'success',
          });
          summary.corrected++;
        } catch (err) {
          console.error(`Error migrating order ${order.order_number}:`, err);
          issues.push({
            order_id: order.id,
            order_number: order.order_number,
            error: err.message,
            attempted_email: correctEmail,
          });
        }
        summary.with_issues++;
      }
    }

    return Response.json({
      summary,
      corrected,
      issues,
      message: `Revisión completada. ${summary.corrected} órdenes corregidas.`
    });
  } catch (error) {
    console.error('migrateOrdersByEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});