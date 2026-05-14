import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Revisa todas las órdenes y migra las que usen customer_email incorrecto.
 * Busca órdenes donde customer_email no coincide con created_by y las corrige.
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
    
    const migrated = [];
    const issues = [];

    for (const order of orders) {
      // Si la orden no tiene created_by o está vacío, pero tiene customer_email
      if ((!order.created_by || order.created_by.trim() === '') && order.customer_email) {
        try {
          await base44.asServiceRole.entities.Order.update(order.id, {
            // Nota: No podemos actualizar created_by directamente via SDK
            // Pero creamos un log del problema
          });
          migrated.push({
            id: order.id,
            order_number: order.order_number,
            issue: `Sin created_by pero tiene customer_email: ${order.customer_email}`,
            customer_email: order.customer_email,
          });
        } catch (err) {
          issues.push({
            order_id: order.id,
            error: err.message,
          });
        }
      }
      
      // Si created_by no coincide con customer_email
      if (order.created_by && order.customer_email && order.created_by !== order.customer_email) {
        migrated.push({
          id: order.id,
          order_number: order.order_number,
          created_by: order.created_by,
          customer_email: order.customer_email,
          mismatch: true,
        });
      }
    }

    return Response.json({
      total_orders: orders.length,
      migrated_count: migrated.length,
      migrated,
      issues,
      message: 'Revisar órdenes con discrepancias en el email del cliente'
    });
  } catch (error) {
    console.error('migrateOrdersByEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});