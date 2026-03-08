import React from 'react';
import { Clock, Package, Truck, CheckCircle2, XCircle } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', color: 'bg-warning/10 text-warning' },
  processing: { icon: Package, label: 'Processing', color: 'bg-primary/10 text-primary' },
  shipped: { icon: Truck, label: 'Shipped', color: 'bg-chart-5/10 text-chart-5' },
  delivered: { icon: CheckCircle2, label: 'Delivered', color: 'bg-success/10 text-success' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}