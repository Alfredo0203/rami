import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Migración: Actualiza registros viejos de user_email a created_by
 * - Valida que todos tengan created_by poblado
 * - Elimina registros sin email válido
 * - Reporte detallado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden ejecutar
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Solo admins pueden ejecutar migraciones' }, { status: 403 });
    }

    const report = {
      timestamp: new Date().toISOString(),
      entities: {},
      totalProcessed: 0,
      totalDeleted: 0,
      totalFixed: 0,
      errors: []
    };

    // Entidades a migrar
    const entitiesToMigrate = [
      { name: 'CartItem', emailField: 'user_email' },
      { name: 'Address', emailField: 'user_email' },
      { name: 'Wishlist', emailField: 'user_email' },
      { name: 'SearchHistory', emailField: 'user_email' },
      { name: 'CouponAssignment', emailField: 'user_email' },
      { name: 'Order', emailField: 'customer_email' },
      { name: 'CancelRequest', emailField: 'customer_email' }
    ];

    // Procesar cada entidad
    for (const { name, emailField } of entitiesToMigrate) {
      const entityReport = { processed: 0, deleted: 0, fixed: 0, errors: [] };
      
      try {
        // Obtener todos los registros
        const records = await base44.asServiceRole.entities[name].list();
        
        for (const record of records) {
          try {
            // Si no tiene created_by pero tiene email en el campo antiguo, actualizar
            if (!record.created_by && record[emailField]) {
              await base44.asServiceRole.entities[name].update(record.id, {
                created_by: record[emailField]
              });
              entityReport.fixed++;
              report.totalFixed++;
            } 
            // Si no tiene created_by ni email antiguo, eliminar
            else if (!record.created_by && !record[emailField]) {
              await base44.asServiceRole.entities[name].delete(record.id);
              entityReport.deleted++;
              report.totalDeleted++;
            }
            
            entityReport.processed++;
            report.totalProcessed++;
          } catch (recordErr) {
            entityReport.errors.push(`Registro ${record.id}: ${recordErr.message}`);
          }
        }
        
        report.entities[name] = entityReport;
      } catch (entityErr) {
        report.errors.push(`${name}: ${entityErr.message}`);
        report.entities[name] = { processed: 0, deleted: 0, fixed: 0, errors: [entityErr.message] };
      }
    }

    console.log('Migración completada:', JSON.stringify(report, null, 2));
    return Response.json(report, { status: 200 });
  } catch (error) {
    console.error('migrateToCreatedBy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});