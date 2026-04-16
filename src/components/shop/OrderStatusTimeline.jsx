import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTimeSV } from '@/lib/dateUtils';
import { Clock, CheckCircle2, Truck, Package } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'Procesando', icon: Package, color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Enviado', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Entregado', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', icon: Clock, color: 'bg-red-100 text-red-700' },
};

export default function OrderStatusTimeline({ orderId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await base44.functions.invoke('getOrderStatusHistory', {
          orderId,
        });
        setHistory(response.data.history || []);
      } catch (error) {
        console.error('Error fetching status history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchHistory();
    } else {
      setLoading(false);
    }

    // Suscribirse a cambios en tiempo real
    const unsubscribe = base44.entities.OrderStatusHistory.subscribe((event) => {
      if (event.type === 'create' && event.data?.order_id === orderId) {
        setHistory(prev => [...prev, event.data].sort((a, b) => 
          new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date)
        ));
      }
    });

    return unsubscribe;
  }, [orderId]);

  if (loading) {
    return <div className="animate-pulse h-20 bg-secondary rounded"></div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-xs text-muted-foreground">Historial De Estado</h3>
        <p className="text-xs text-muted-foreground">Sin historial disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-xs text-muted-foreground">Historial De Estado</h3>
      <div className="relative">
        {history.map((record, idx) => {
          const config = statusConfig[record.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = idx === history.length - 1;

          return (
            <div key={record.id} className="flex gap-3 pb-4 relative">
              {/* Línea conectora */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-0.5 h-8 bg-border" />
              )}

              {/* Icono de estado */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color} mt-0.5`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Contenido */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{config.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                   {formatDateTimeSV(record.timestamp || record.created_date)}
                  </span>
                </div>
                {record.notes && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{record.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}