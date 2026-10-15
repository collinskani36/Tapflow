import { OrderStatus } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending_verification: { label: 'Pending', className: 'bg-warning/20 text-warning' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/20 text-primary' },
  processing: { label: 'Processing', className: 'bg-blue-500/20 text-blue-400' },
  out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Delivered', className: 'bg-success/20 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-destructive' },
};

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
