import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Bike, Phone, Star } from 'lucide-react';
import { updateOrderStatus, markOrderRead } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import OrderTracker from '@/components/OrderTracker';

// ---------------------------
// HELPERS
// ---------------------------
const statusColors: Record<OrderStatus, string> = {
  pending_verification: 'bg-yellow-500/20 text-yellow-500',
  confirmed:            'bg-blue-500/20 text-blue-500',
  processing:           'bg-purple-500/20 text-purple-500',
  out_for_delivery:     'bg-orange-500/20 text-orange-500',
  delivered:            'bg-green-500/20 text-green-500',
  completed:            'bg-green-700/20 text-green-700',
  rejected:             'bg-red-500/20 text-red-500',
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

const formatStatus = (status: OrderStatus) => status.replace(/_/g, ' ');

// ---------------------------
// MINI STAR DISPLAY (read-only)
// ---------------------------
const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3.5 h-3.5 ${
          star <= rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-border fill-transparent'
        }`}
      />
    ))}
    <span className="text-xs text-muted-foreground ml-1">
      {rating}/5
    </span>
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

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">Orders</h2>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = !!expanded[order.id];
            const canAdvance = !!nextStatus[order.status];
            const rider = order.riders;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-xl border transition-colors ${
                  !order.is_read ? 'border-primary/40' : 'border-border/50'
                }`}
              >
                {/* ── CARD HEADER ── */}
                <div className="p-4 space-y-2">

                  {/* TOP ROW */}
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {order.phone_number}
                    </p>

                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${
                        statusColors[order.status]
                      }`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>

                  {/* ORDER META */}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      <span className="text-foreground/60">Txn:</span>{' '}
                      <span className="text-foreground font-medium">
                        {order.transaction_code}
                      </span>
                    </p>
                    <p>
                      <span className="text-foreground/60">Total:</span>{' '}
                      <span className="gold-text font-semibold">
                        KSh {Number(order.total_amount).toLocaleString()}
                      </span>
                    </p>
                    {order.location_description && (
                      <p>
                        <span className="text-foreground/60">Location:</span>{' '}
                        {order.location_description}
                      </p>
                    )}
                  </div>

                  {/* RATING — shown when buyer has rated */}
                  {order.rating != null && order.rating > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs text-muted-foreground">Rating:</span>
                      <RatingStars rating={order.rating} />
                    </div>
                  )}

                  {/* RIDER INFO */}
                  {rider && (
                    <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {rider.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Assigned rider
                          </p>
                        </div>
                      </div>
                      <a
                        href={`tel:${rider.phone}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {rider.phone}
                      </a>
                    </div>
                  )}

                  {/* RECEIVED BADGE */}
                  {order.is_received && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Buyer confirmed receipt
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {!order.is_read && (
                      <button
                        onClick={() => handleMarkRead(order.id)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition"
                      >
                        Mark Read
                      </button>
                    )}

                    {/* Don't show "Move to out_for_delivery" — handled via assign rider */}
                    {canAdvance && order.status !== 'processing' && (
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        className="px-3 py-1.5 rounded-lg gold-gradient text-xs text-primary-foreground hover:opacity-90 transition"
                      >
                        Move to {formatStatus(nextStatus[order.status]!)}
                      </button>
                    )}

                    <button
                      onClick={() => toggle(order.id)}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      {isExpanded ? (
                        <>Hide tracker <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>View tracker <ChevronDown className="w-3.5 h-3.5" /></>
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
                      <div className="px-4 pb-4 border-t border-border/50 pt-3">
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
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;