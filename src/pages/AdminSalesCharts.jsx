import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSalesCharts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [timeframe, setTimeframe] = useState('7days'); // 7days, 30days, all

  React.useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || (u.role !== 'admin' && u.role !== 'super_admin')) { navigate(-1); return; }
      setUser(u);
    }).catch(() => navigate(-1));
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-sales-charts-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-for-charts'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: inventoryLogs = [] } = useQuery({
    queryKey: ['admin-inventory-logs'],
    queryFn: () => base44.entities.InventoryLog.list('-created_date'),
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!orders.length) return { daily: [], weekly: [] };

    const now = new Date();
    const filtered = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      const orderDate = new Date(o.created_date);
      if (timeframe === '7days') return (now - orderDate) <= 7 * 24 * 60 * 60 * 1000;
      if (timeframe === '30days') return (now - orderDate) <= 30 * 24 * 60 * 60 * 1000;
      return true;
    });

    // Daily data
    const dailyMap = {};
    filtered.forEach(order => {
      const date = new Date(order.created_date);
      const key = date.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, orders: 0 };
      dailyMap[key].revenue += order.total || 0;
      dailyMap[key].orders += 1;
    });

    const daily = Object.values(dailyMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('es-SV', { month: 'short', day: 'numeric' })
      }));

    // Weekly data
    const weeklyMap = {};
    filtered.forEach(order => {
      const date = new Date(order.created_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeklyMap[key]) weeklyMap[key] = { week: key, revenue: 0, orders: 0 };
      weeklyMap[key].revenue += order.total || 0;
      weeklyMap[key].orders += 1;
    });

    const weekly = Object.values(weeklyMap)
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .map(w => ({
        ...w,
        week: new Date(w.week).toLocaleDateString('es-SV', { month: 'short', day: 'numeric' })
      }));

    return { daily, weekly };
  }, [orders, timeframe]);

  const filteredForStats = chartData.daily.length > 0 || chartData.weekly.length > 0 
    ? orders.filter(o => {
        if (o.status !== 'delivered') return false;
        const now = new Date();
        const orderDate = new Date(o.created_date);
        if (timeframe === '7days') return (now - orderDate) <= 7 * 24 * 60 * 60 * 1000;
        if (timeframe === '30days') return (now - orderDate) <= 30 * 24 * 60 * 60 * 1000;
        return true;
      })
    : [];
  
  // Calcular gastos totales
  const totalCost = filteredForStats.reduce((sum, order) => {
    const orderItems = order.items || [];
    const itemsCost = orderItems.reduce((itemSum, item) => {
      const product = products.find(p => p.id === item.product_id);
      const costPerUnit = product?.cost_per_unit || 0;
      return itemSum + (costPerUnit * (item.quantity || 0));
    }, 0);
    return sum + itemsCost;
  }, 0);
  
  const totalRevenue = filteredForStats.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = filteredForStats.length;
  const avgOrderValue = totalOrders ? (totalRevenue / totalOrders).toFixed(2) : 0;
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate('/Admin')} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Gráficas de Ventas</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-3 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">Ingresos</p>
          <p className="text-lg font-bold text-success">${totalRevenue.toFixed(0)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg p-3 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="text-lg font-bold text-chart-2">${totalCost.toFixed(0)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-lg p-3 shadow-sm col-span-2"
        >
          <p className="text-xs text-muted-foreground">Ganancia</p>
          <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${totalProfit.toFixed(0)}
          </p>
        </motion.div>
      </div>

      {/* Timeframe Filter */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant={timeframe === '7days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('7days')}
            className="flex-1"
          >
            7 días
          </Button>
          <Button
            variant={timeframe === '30days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('30days')}
            className="flex-1"
          >
            30 días
          </Button>
          <Button
            variant={timeframe === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('all')}
            className="flex-1"
          >
            Todo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="daily" className="px-4">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="daily" className="flex-1">Por Día</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">Por Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="bg-card rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Ventas Diarias</h3>
              {chartData.daily.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-10">No hay datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value, name) => {
                        if (name === 'Ingresos ($)') return `$${value.toFixed(2)}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} name="Ingresos ($)" />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} name="Órdenes" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weekly">
            <div className="bg-card rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Ventas Semanales</h3>
              {chartData.weekly.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-10">No hay datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value, name) => {
                        if (name === 'Ingresos ($)') return `$${value.toFixed(2)}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--success))" name="Ingresos ($)" />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" name="Órdenes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}