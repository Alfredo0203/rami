import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, TrendingUp, AlertTriangle, ShoppingCart, DollarSign, ArrowLeftRight, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || (u.role !== 'admin' && u.role !== 'super_admin')) { 
        navigate(-1); 
        return; 
      }
      setUser(u);
    }).catch(() => navigate(-1));
  }, []);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => base44.functions.invoke('getInventoryDashboard', {}),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Valor Inventario', 
      value: `$${(dashboard?.summary?.total_inventory_value || 0).toFixed(2)}`, 
      icon: DollarSign, 
      color: 'bg-success/10 text-success',
      subtext: `${dashboard?.summary.active_products || 0} productos activos`
    },
    { 
      label: 'Productos', 
      value: dashboard?.summary.total_products || 0, 
      icon: Package, 
      color: 'bg-primary/10 text-primary',
      subtext: `${dashboard?.summary.out_of_stock_count || 0} agotados`
    },
    { 
      label: 'Ventas (30 días)', 
      value: dashboard?.summary.recent_sales_units || 0, 
      icon: ShoppingCart, 
      color: 'bg-chart-5/10 text-chart-5',
      subtext: 'Unidades vendidas'
    },
    { 
      label: 'Rotación Prom.', 
      value: (dashboard?.summary.avg_turnover_rate || 0).toFixed(2), 
      icon: TrendingUp, 
      color: 'bg-chart-1/10 text-chart-1',
      subtext: 'Veces por mes'
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Dashboard de Inventario</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-3 shadow-sm"
              >
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.subtext}</p>
              </motion.div>
            ))}
          </div>

          {/* Alertas */}
          {(dashboard?.alerts.out_of_stock.length > 0 || dashboard?.alerts.low_stock.length > 0) && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Alertas de Stock ({dashboard?.alerts.out_of_stock.length + dashboard?.alerts.low_stock.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {dashboard?.alerts.out_of_stock.map(product => (
                      <div key={product.product_id} className="flex items-center justify-between text-xs">
                        <span className="text-destructive font-medium">{product.product_name}</span>
                        <Badge variant="destructive">Agotado</Badge>
                      </div>
                    ))}
                    {dashboard?.alerts.low_stock.map(product => (
                      <div key={product.product_id} className="flex items-center justify-between text-xs">
                        <span className="text-warning font-medium">{product.product_name}</span>
                        <Badge className="bg-warning/10 text-warning">Stock: {product.total_stock}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="products" className="space-y-3">
            <TabsList className="w-full justify-start bg-transparent overflow-x-auto">
              <TabsTrigger value="products" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="high_turnover" className="text-xs">Más Vendidos</TabsTrigger>
              <TabsTrigger value="low_stock" className="text-xs">Stock Bajo</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-2">
              {dashboard?.products.slice(0, 20).map((product, i) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-lg p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{product.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          Stock: {product.total_stock}
                        </Badge>
                        {product.turnover_rate > 1 && (
                          <Badge className="bg-chart-1/10 text-chart-1 text-[10px]">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {product.turnover_rate}x
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">${product.price?.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Margen: {product.margin?.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold">${product.total_value?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ventas (30d)</p>
                      <p className="font-semibold">{product.recent_sales}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Compras (30d)</p>
                      <p className="font-semibold">{product.recent_purchases}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="high_turnover" className="space-y-2">
              {dashboard?.alerts.high_turnover.slice(0, 10).map((product, i) => (
                <div key={product.product_id} className="bg-card rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{product.product_name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.total_stock}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-chart-1/10 text-chart-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {product.turnover_rate}x/mes
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{product.recent_sales} ventas</p>
                    </div>
                  </div>
                </div>
              ))}
              {dashboard?.alerts.high_turnover.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay productos con alta rotación</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="low_stock" className="space-y-2">
              {(dashboard?.alerts.low_stock || []).map((product, i) => (
                <div key={product.product_id} className="bg-card rounded-lg p-3 shadow-sm border border-warning/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{product.product_name}</p>
                      <p className="text-xs text-muted-foreground">Valor: ${product.total_value?.toFixed(2)}</p>
                    </div>
                    <Badge className="bg-warning/10 text-warning">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {product.total_stock} unid.
                    </Badge>
                  </div>
                </div>
              ))}
              {dashboard?.alerts.low_stock.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay productos con stock bajo</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}