import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Bike, Phone, Star } from 'lucide-react';
import { updateOrderStatus, markOrderRead } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import OrderTracker from '@/components/OrderTracker';

// ---------------------------
// HELPERS
// ---------------------------
const ACTIVE_STATUSES: OrderStatus[] = [
  'pending_verification',
  'confirmed',
  'processing',
  'out_for_delivery',
];

const statusColors: Record<OrderStatus, string> = {
  pending_verification: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30',
  confirmed:            'bg-blue-500/10 text-blue-400 border border-blue-400/30',
  processing:           'bg-purple-500/10 text-purple-400 border border-purple-400/30',
  out_for_delivery:     'bg-orange-500/10 text-orange-400 border border-orange-400/30',
  delivered:            'bg-green-500/10 text-green-500 border border-green-500/30',
  completed:            'bg-green-700/10 text-green-600 border border-green-600/30',
  rejected:             'bg-red-500/10 text-red-400 border border-red-400/30',
};

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending_verification: 'confirmed',
  confirmed:            'processing',
  processing:           'out_for_delivery',
  out_for_delivery:     'delivered',
  delivered:            'completed',
  completed:            null,
  rejected:             null,
};

const formatStatus = (status: OrderStatus) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ---------------------------
// MINI STAR DISPLAY (read-only)
// ---------------------------
const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3 h-3 ${
          star <= rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-border fill-transparent'
        }`}
      />
    ))}
    <span className="text-[11px] text-muted-foreground ml-1 font-mono">
      {rating}/5
    </span>
  </div>
);

// ---------------------------
// SECTION LABEL
// ---------------------------
const SectionLabel = ({ label, count }: { label: string; count: number }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-primary/30 text-primary/70 bg-primary/5">
      {count}
    </span>
    <div className="flex-1 h-px bg-border/40" />
  </div>
);

// ---------------------------
// PROPS
// ---------------------------
interface OrderWithExtras extends Order {
  riders?: { id: string; name: string; phone: string } | null;
  is_received?: boolean;
  rating?: number | null;
}

interface Props {
  orders: OrderWithExtras[];
  onRefresh: () => void;
}

// ---------------------------
// COMPONENT
// ---------------------------
const AdminOrders = ({ orders, onRefresh }: Props) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAdvanceStatus = async (order: OrderWithExtras) => {
    const next = nextStatus[order.status];
    if (!next) return;
    await updateOrderStatus(order.id, next);
    onRefresh();
  };

  const handleMarkRead = async (id: string) => {
    await markOrderRead(id);
    onRefresh();
  };

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const closedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  const renderOrder = (order: OrderWithExtras) => {
    const isExpanded = !!expanded[order.id];
    const canAdvance = !!nextStatus[order.status];
    const rider = order.riders;
    const isActive = ACTIVE_STATUSES.includes(order.status);

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={[
          'rounded-xl overflow-hidden transition-all duration-200',
          isActive
            ? 'border-l-2 border-l-primary border border-border/50 bg-card'
            : 'border border-border/30 bg-card/60 opacity-70',
          !order.is_read && isActive
            ? 'shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]'
            : '',
        ].join(' ')}
      >
        {/* ── CARD HEADER ── */}
        <div className="p-4 space-y-3">

          {/* TOP ROW */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              {!order.is_read && isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              )}
              <p className="text-sm font-medium text-foreground font-mono">
                {order.phone_number}
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColors[order.status]}`}
            >
              {formatStatus(order.status)}
            </span>
          </div>

          {/* ORDER META */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Transaction
              </p>
              <p className="text-xs font-mono text-foreground/80 tracking-wide">
                {order.transaction_code}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Total
              </p>
              <p className="text-sm font-semibold gold-text">
                KSh {Number(order.total_amount).toLocaleString()}
              </p>
            </div>
            {order.location_description && (
              <div className="col-span-2 space-y-0.5">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                  Delivery location
                </p>
                <p className="text-xs text-foreground/70">{order.location_description}</p>
              </div>
            )}
          </div>

          {/* RATING — shown when buyer has rated */}
          {order.rating != null && order.rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Rating
              </span>
              <RatingStars rating={order.rating} />
            </div>
          )}

          {/* RIDER INFO */}
          {rider && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border/50">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <Bike className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{rider.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{rider.phone}</p>
              </div>
              <a
                href={`tel:${rider.phone}`}
                className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition shrink-0"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
            </div>
          )}

          {/* RECEIVED BADGE */}
          {order.is_received && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/8 border border-green-600/30 text-green-600 text-[10px] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Buyer confirmed receipt
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 pt-0.5 flex-wrap items-center">
            {!order.is_read && (
              <button
                onClick={() => handleMarkRead(order.id)}
                className="px-3 py-1.5 rounded-lg border border-border/60 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                Mark read
              </button>
            )}

            {/* Don't show "Move to out_for_delivery" — handled via assign rider */}
            {canAdvance && order.status !== 'processing' && (
              <button
                onClick={() => handleAdvanceStatus(order)}
                className="px-3 py-1.5 rounded-lg gold-gradient text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                → {formatStatus(nextStatus[order.status]!)}
              </button>
            )}

            <button
              onClick={() => toggle(order.id)}
              className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              {isExpanded ? (
                <>Hide <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Tracker <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE TRACKER ── */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="tracker"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border/40 pt-3">
                <OrderTracker
                  status={order.status}
                  orderId={order.id}
                  isAdmin={true}
                  onRiderAssigned={onRefresh}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground tracking-tight">Orders</h2>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground/50 py-16 text-sm">
          No orders yet.
        </p>
      ) : (
        <>
          {/* ACTIVE ORDERS */}
          {activeOrders.length > 0 && (
            <section className="space-y-2.5">
              <SectionLabel label="Active orders" count={activeOrders.length} />
              {activeOrders.map(renderOrder)}
            </section>
          )}

          {/* CLOSED ORDERS */}
          {closedOrders.length > 0 && (
            <section className="space-y-2.5">
              <SectionLabel label="Closed orders" count={closedOrders.length} />
              {closedOrders.map(renderOrder)}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminOrders;