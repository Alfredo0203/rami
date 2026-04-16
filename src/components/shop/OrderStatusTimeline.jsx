import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
        const records = await base44.entities.OrderStatusHistory.filter({
          order_id: orderId,
        });
        const sorted = records.sort((a, b) => 
          new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date)
        );
        setHistory(sorted);
      } catch (error) {
        console.error('Error fetching status history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

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
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Historial de Estado</h3>
      <div className="relative">
        {history.map((record, idx) => {
          const config = statusConfig[record.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = idx === history.length - 1;

          return (
            <div key={record.id} className="flex gap-4 pb-8 relative">
              {/* Línea conectora */}
              {!isLast && (
                <div className="absolute left-6 top-12 w-1 h-12 bg-gray-200" />
              )}

              {/* Icono de estado */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.color}`}>
                <Icon className="w-6 h-6" />
              </div>

              {/* Contenido */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(record.timestamp || record.created_date), 'dd MMM yyyy HH:mm', { locale: es })}
                  </span>
                </div>
                {record.notes && (
                  <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}