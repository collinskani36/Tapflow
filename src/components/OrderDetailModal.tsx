import { useEffect, useState } from 'react';
import { X, Bike, Phone, Star, PackageCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderTracker from '@/components/OrderTracker';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

type OrderDetail = Order;

interface Props {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

const StarRating = ({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-border fill-transparent'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ratingLabels: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent!',
};

const OrderDetailModal = ({ orderId, open, onClose }: Props) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, phone_number, transaction_code, total_amount, status, created_at,
          is_received, rating,
          delivery_locations ( name ),
          order_items ( id, quantity, price_at_time, products ( name ) ),
          riders ( id, name, phone )
        `)
        .eq('id', orderId)
        .single();

      if (cancelled) return;

      if (!error && data) {
        setOrder(data as unknown as OrderDetail);
        if (data.rating) {
          setRating(data.rating);
          setRatingDone(true);
        } else {
          setRating(0);
          setRatingDone(false);
        }
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  const handleReceived = async () => {
    if (!order?.id) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('orders')
      .update({ is_received: true, status: 'completed' })
      .eq('id', order.id);

    if (!error) {
      setOrder((prev) => (prev ? { ...prev, is_received: true, status: 'completed' } : prev));
    }
    setSubmitting(false);
  };

  const handleSubmitRating = async () => {
    if (!order?.id || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from('orders').update({ rating }).eq('id', order.id);
    if (!error) {
      setOrder((prev) => (prev ? { ...prev, rating } : prev));
      setRatingDone(true);
    }
    setSubmitting(false);
  };

  const itemsSubtotal = order
    ? (order.order_items ?? []).reduce((sum, item) => sum + item.price_at_time * item.quantity, 0)
    : 0;
  const deliveryFee = order ? Number(order.total_amount) - itemsSubtotal : 0;

  const hasRider = !!order?.riders;
  const isDelivered = order?.status === 'delivered';
  const isCompleted = order?.status === 'completed';
  const isReceived = order?.is_received || isCompleted;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:inset-0 md:m-auto z-[100] max-h-[85vh] md:max-w-lg md:rounded-2xl rounded-t-2xl bg-background overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 md:hidden shrink-0" />

            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40 shrink-0">
              <span className="font-display text-base text-foreground">Order Details</span>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              {loading || !order ? (
                <div className="py-12 text-center text-muted-foreground text-sm animate-pulse">
                  Loading order…
                </div>
              ) : (
                <>
                  <OrderTracker status={order.status} />

                  {hasRider && (
                    <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-primary" />
                        <h3 className="font-display text-sm text-foreground font-semibold">Your Rider</h3>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{order.riders!.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">On the way to you</p>
                        </div>
                        <a
                          href={`tel:${order.riders!.phone}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {order.riders!.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {(isDelivered || isReceived) && (
                    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                      {!isReceived ? (
                        <div className="p-5 space-y-4 text-center">
                          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <PackageCheck className="w-6 h-6 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Got your package?</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Confirm delivery so we know everything arrived safely.
                            </p>
                          </div>
                          <button
                            onClick={handleReceived}
                            disabled={submitting}
                            className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            <PackageCheck className="w-4 h-4" />
                            {submitting ? 'Confirming…' : 'I Received My Order'}
                          </button>
                        </div>
                      ) : (
                        <div className="p-5 space-y-4">
                          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                              <PackageCheck className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Order Received</p>
                              <p className="text-xs text-muted-foreground">
                                {ratingDone ? 'Thanks for your feedback!' : 'How was your experience?'}
                              </p>
                            </div>
                          </div>

                          {ratingDone ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <StarRating value={rating} readonly />
                              <p className="text-sm font-medium text-foreground">{ratingLabels[rating] ?? 'Rated'}</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-col items-center gap-2">
                                <StarRating value={rating} onChange={setRating} />
                                <p className={`text-sm font-medium ${rating > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {rating > 0 ? ratingLabels[rating] : 'Tap a star to rate'}
                                </p>
                              </div>
                              <button
                                onClick={handleSubmitRating}
                                disabled={rating === 0 || submitting}
                                className="w-full py-2.5 rounded-xl gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
                              >
                                <Star className="w-4 h-4" />
                                {submitting ? 'Saving…' : 'Submit Rating'}
                              </button>
                              <button
                                onClick={() => setRatingDone(true)}
                                className="w-full text-xs text-muted-foreground hover:text-foreground transition py-1"
                              >
                                Skip for now
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="glass-card rounded-xl p-4 space-y-4 border border-border/50">
                    <h3 className="font-display text-base text-foreground">Order Summary</h3>

                    <div className="space-y-2">
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.products?.name ?? 'Product'} × {item.quantity}
                          </span>
                          <span className="text-foreground">
                            KSh {(item.price_at_time * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border/50 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>KSh {itemsSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Delivery Fee</span>
                        <span>KSh {deliveryFee.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="gold-text text-lg">KSh {order.total_amount.toLocaleString()}</span>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 pt-2">
                      <p>
                        Transaction: <span className="text-foreground font-medium">{order.transaction_code}</span>
                      </p>
                      <p>
                        Phone: <span className="text-foreground font-medium">{order.phone_number}</span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailModal;