import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * getInventoryDashboard - Retorna métricas avanzadas de inventario para admin
 * Incluye: valor total del inventario, productos con stock bajo, rotación, etc.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todos los productos
    const products = await base44.asServiceRole.entities.Product.list();
    
    // Obtener todas las variantes
    const variants = await base44.asServiceRole.entities.ProductVariant.list();
    
    // Obtener movimientos de inventario de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inventoryLogs = await base44.asServiceRole.entities.InventoryLog.list('-created_date', 1000);
    const recentLogs = inventoryLogs.filter(log => 
      new Date(log.created_date) >= thirtyDaysAgo
    );

    // Calcular métricas por producto
    const productMetrics = products.map(product => {
      // Calcular stock total (con o sin variantes)
      let totalStock = 0;
      let totalValue = 0;
      
      if (product.has_variants) {
        const productVariants = variants.filter(v => v.product_id === product.id);
        totalStock = productVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
        totalValue = productVariants.reduce((sum, v) => {
          const cost = v.cost_per_unit || product.cost_per_unit || 0;
          return sum + (v.stock || 0) * cost;
        }, 0);
      } else {
        totalStock = product.stock || 0;
        totalValue = (product.stock || 0) * (product.cost_per_unit || 0);
      }

      // Calcular unidades vendidas en últimos 30 días
      const recentSales = recentLogs
        .filter(log => 
          log.product_id === product.id && 
          log.movement_type === 'sale' &&
          log.quantity < 0
        )
        .reduce((sum, log) => sum + Math.abs(log.quantity), 0);

      // Calcular compras en últimos 30 días
      const recentPurchases = recentLogs
        .filter(log => 
          log.product_id === product.id && 
          (log.movement_type === 'purchase' || log.movement_type === 'return') &&
          log.quantity > 0
        )
        .reduce((sum, log) => sum + log.quantity, 0);

      // Tasa de rotación (ventas / stock promedio)
      const avgStock = totalStock > 0 ? totalStock : 1;
      const turnoverRate = recentSales / avgStock;

      return {
        product_id: product.id,
        product_name: product.name,
        total_stock: totalStock,
        total_value: totalValue,
        cost_per_unit: product.cost_per_unit || 0,
        price: product.price || 0,
        margin: product.price && product.cost_per_unit 
          ? ((product.price - product.cost_per_unit) / product.price * 100) 
          : 0,
        recent_sales: recentSales,
        recent_purchases: recentPurchases,
        turnover_rate: parseFloat(turnoverRate.toFixed(2)),
        is_low_stock: totalStock > 0 && totalStock < 5,
        is_out_of_stock: totalStock === 0,
      };
    });

    // Métricas globales
    const totalInventoryValue = productMetrics.reduce((sum, m) => sum + m.total_value, 0);
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active !== false).length;
    const outOfStockCount = productMetrics.filter(m => m.is_out_of_stock).length;
    const lowStockCount = productMetrics.filter(m => m.is_low_stock && !m.is_out_of_stock).length;
    const totalRecentSales = productMetrics.reduce((sum, m) => sum + m.recent_sales, 0);
    const avgTurnoverRate = productMetrics.reduce((sum, m) => sum + m.turnover_rate, 0) / productMetrics.length;

    return Response.json({
      summary: {
        total_inventory_value: totalInventoryValue,
        total_products: totalProducts,
        active_products: activeProducts,
        out_of_stock_count: outOfStockCount,
        low_stock_count: lowStockCount,
        recent_sales_units: totalRecentSales,
        avg_turnover_rate: parseFloat(avgTurnoverRate.toFixed(2)),
      },
      products: productMetrics.sort((a, b) => b.total_value - a.total_value),
      alerts: {
        out_of_stock: productMetrics.filter(m => m.is_out_of_stock),
        low_stock: productMetrics.filter(m => m.is_low_stock && !m.is_out_of_stock),
        high_turnover: productMetrics.filter(m => m.turnover_rate > 1).sort((a, b) => b.turnover_rate - a.turnover_rate),
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});