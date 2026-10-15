import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Bike, Phone, Star, PackageCheck, Wine } from 'lucide-react';
import Header from '@/components/Header';
import OrderTracker from '@/components/OrderTracker';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

type OrderWithRider = Order;

// ============================================================
// STAR RATING WIDGET
// ============================================================
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
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-transform ${
            !readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
          }`}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-border fill-transparent'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent!',
};

// ============================================================
// PAGE
// ============================================================
const OrderConfirmationPage = () => {
  const [order, setOrder] = useState<OrderWithRider | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  // Load order
  useEffect(() => {
    const loadOrder = async () => {
      const raw = sessionStorage.getItem('lastOrder');
      if (!raw) { setLoading(false); return; }

      const parsed = JSON.parse(raw);
      const orderId = parsed.id;
      if (!orderId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*, products (*)),
          delivery_locations (*),
          riders (id, name, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) { console.error(error); setLoading(false); return; }

      setOrder(data);
      if (data.rating) {
        setRating(data.rating);
        setRatingDone(true);
      }
      setLoading(false);
    };

    loadOrder();
  }, []);

  // Real-time listener
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel('order-live-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        async (payload) => {
          const newRiderId = payload.new?.rider_id;
          const prevRiderId = order.riders?.id;

          if (newRiderId && newRiderId !== prevRiderId) {
            const { data } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (*, products (*)),
                delivery_locations (*),
                riders (id, name, phone)
              `)
              .eq('id', order.id)
              .single();

            if (data) setOrder(data);
          } else {
            setOrder((prev) => prev ? { ...prev, ...payload.new } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order?.id, order?.riders?.id]);

  // Mark as received
  const handleReceived = async () => {
    if (!order?.id) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('orders')
      .update({ is_received: true, status: 'completed' })
      .eq('id', order.id);

    if (!error) {
      setOrder((prev) =>
        prev ? { ...prev, is_received: true, status: 'completed' } : prev
      );
    }
    setSubmitting(false);
  };

  // Submit rating
  const handleSubmitRating = async () => {
    if (!order?.id || rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('orders')
      .update({ rating })
      .eq('id', order.id);

    if (!error) {
      setOrder((prev) => prev ? { ...prev, rating } : prev);
      setRatingDone(true);
    }
    setSubmitting(false);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center">
          <p className="text-muted-foreground text-sm animate-pulse">Loading your order…</p>
        </main>
      </div>
    );
  }

  // Not found
  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center">
          <p className="text-muted-foreground text-sm">No order found.</p>
          <Link to="/" className="text-primary text-sm hover:underline mt-2 inline-block">
            Back to shop
          </Link>
        </main>
      </div>
    );
  }

  const hasRider = !!order.riders;
  const isDelivered = order.status === 'delivered';
  const isCompleted = order.status === 'completed';
  const isReceived = order.is_received || isCompleted;

  // Totals
  const itemsSubtotal = (order.order_items ?? []).reduce(
    (sum, item) => sum + item.price_at_time * item.quantity,
    0
  );
  const deliveryFee = Number(order.total_amount) - itemsSubtotal;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 max-w-md mx-auto space-y-4">

        {/* ── CONFIRMATION HERO ─────────────────────────────────────────────── */}
        <div className="text-center pt-2 pb-4 space-y-2">
          {/* Icon */}
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>

          <h1 className="font-display text-2xl text-foreground tracking-tight">Order Confirmed</h1>

          {/* Ornament */}
          <div className="flex items-center justify-center gap-2.5 my-1">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
            <Wine className="w-3 h-3 gold-text opacity-60" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
          </div>

          <p className="text-xs text-muted-foreground tracking-wide">Live tracking is active</p>
        </div>

        {/* ── TRACKER ───────────────────────────────────────────────────────── */}
        <OrderTracker status={order.status} />

        {/* ── RIDER CARD ────────────────────────────────────────────────────── */}
        {hasRider && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 space-y-3">
            <p className="text-[10px] tracking-widest text-muted-foreground font-medium">
              🏍️ YOUR RIDER
            </p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bike className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {order.riders!.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">On the way</p>
                </div>
              </div>

              <a
                href={`tel:${order.riders!.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl gold-gradient text-primary-foreground text-xs font-medium hover:opacity-90 transition shrink-0"
              >
                <Phone className="w-3 h-3" />
                {order.riders!.phone}
              </a>
            </div>
          </div>
        )}

        {/* ── RECEIVED + RATING ─────────────────────────────────────────────── */}
        {(isDelivered || isReceived) && (
          <div className="rounded-2xl border border-border/30 overflow-hidden bg-card">

            {!isReceived ? (
              /* Step 1 — confirm receipt */
              <div className="p-5 space-y-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Got your order?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirm so we know everything arrived safely.
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
              /* Step 2 — rate */
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                  <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <PackageCheck className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Delivered</p>
                    <p className="text-xs text-muted-foreground">
                      {ratingDone ? 'Thanks for the feedback!' : 'How was your experience?'}
                    </p>
                  </div>
                </div>

                {ratingDone ? (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <StarRating value={rating} readonly />
                    <p className="text-sm font-medium text-foreground">{ratingLabels[rating] ?? 'Rated'}</p>
                    <p className="text-xs text-muted-foreground">Rating saved — thank you!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <StarRating value={rating} onChange={setRating} />
                      <p className={`text-xs transition-all ${rating > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {rating > 0 ? ratingLabels[rating] : 'Tap a star to rate'}
                      </p>
                    </div>
                    <button
                      onClick={handleSubmitRating}
                      disabled={rating === 0 || submitting}
                      className="w-full py-2.5 rounded-xl gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Star className="w-3.5 h-3.5" />
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

        {/* ── ORDER SUMMARY ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-border/20">
            <p className="text-[10px] tracking-widest text-muted-foreground font-medium">🧾 ORDER SUMMARY</p>
          </div>

          {/* Items */}
          <div className="px-4 py-3 space-y-2">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Mini product image */}
                  <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {(item.products as any)?.image_url ? (
                      <img
                        src={(item.products as any).image_url}
                        alt={item.products?.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Wine className="w-4 h-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-[13px] leading-tight line-clamp-1">
                      {item.products?.name ?? 'Product'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">× {item.quantity}</p>
                  </div>
                </div>
                <span className="text-foreground text-[13px] shrink-0">
                  KSh {(item.price_at_time * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 pb-4 pt-2 border-t border-border/20 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>KSh {itemsSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Delivery</span>
              <span>KSh {deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/20">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="font-display text-lg gold-text">
                KSh {order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="px-4 pb-4 pt-0 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Transaction</span>
              <span className="text-foreground font-medium">{order.transaction_code}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Phone</span>
              <span className="text-foreground font-medium">{order.phone_number}</span>
            </div>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <Link
          to="/"
          className="block text-center py-3 rounded-2xl border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          Continue Shopping
        </Link>

      </main>
    </div>
  );
};

export default OrderConfirmationPage;