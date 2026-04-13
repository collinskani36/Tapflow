import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Bike, Phone, Star, PackageCheck } from 'lucide-react';
import Header from '@/components/Header';
import OrderTracker from '@/components/OrderTracker';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

interface OrderWithRider extends Order {
  riders?: { id: string; name: string; phone: string } | null;
  is_received?: boolean;
  rating?: number | null;
}

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
    <div className="flex items-center gap-1">
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
            className={`w-7 h-7 transition-colors ${
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

  // Rating flow state
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  // ---------------------------
  // 1️⃣ LOAD ORDER
  // ---------------------------
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
      // Pre-fill if already rated
      if (data.rating) {
        setRating(data.rating);
        setRatingDone(true);
      }
      setLoading(false);
    };

    loadOrder();
  }, []);

  // ---------------------------
  // 2️⃣ REAL-TIME LISTENER
  // ---------------------------
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

  // ---------------------------
  // MARK AS RECEIVED
  // ---------------------------
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

  // ---------------------------
  // SUBMIT RATING
  // ---------------------------
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

  // ---------------------------
  // LOADING / NOT FOUND
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center">
          <p className="text-muted-foreground animate-pulse">Loading your order…</p>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center">
          <p className="text-muted-foreground">No order found.</p>
          <Link to="/" className="text-primary text-sm hover:underline mt-2 inline-block">
            Go back to shop
          </Link>
        </main>
      </div>
    );
  }

  const hasRider = !!order.riders;
  const isDelivered = order.status === 'delivered';
  const isCompleted = order.status === 'completed';
  const isReceived = order.is_received || isCompleted;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto space-y-6">

        {/* HERO */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="font-display text-2xl text-foreground">Order Confirmed</h1>
          <p className="text-muted-foreground text-sm">Live tracking is active</p>
        </div>

        {/* TRACKER */}
        <OrderTracker status={order.status} />

        {/* RIDER CARD */}
        {hasRider && (
          <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-primary" />
              <h2 className="font-display text-base text-foreground font-semibold">
                Your Rider
              </h2>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {order.riders!.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">On the way to you</p>
                </div>
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

        {/* ── RECEIVED + RATING BLOCK ── */}
        {(isDelivered || isReceived) && (
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">

            {!isReceived ? (
              /* STEP 1 — confirm receipt */
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
              /* STEP 2 — rate the experience */
              <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <PackageCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Order Received</p>
                    <p className="text-xs text-muted-foreground">
                      {ratingDone
                        ? 'Thanks for your feedback!'
                        : 'How was your experience?'}
                    </p>
                  </div>
                </div>

                {ratingDone ? (
                  /* SUBMITTED — show readonly stars */
                  <div className="flex flex-col items-center gap-2 py-2">
                    <StarRating value={rating} readonly />
                    <p className="text-sm font-medium text-foreground">
                      {ratingLabels[rating] ?? 'Rated'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your rating has been saved — thank you!
                    </p>
                  </div>
                ) : (
                  /* RATING INPUT */
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <StarRating value={rating} onChange={setRating} />
                      <p
                        className={`text-sm font-medium transition-all ${
                          rating > 0 ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
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

        {/* ORDER SUMMARY */}
        <div className="glass-card rounded-xl p-4 space-y-4 border border-border/50">
          <h2 className="font-display text-lg text-foreground">Order Summary</h2>

          <div className="space-y-2">
            {order.order_items?.map((item) => (
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

          <div className="border-t border-border pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="gold-text text-lg">
              KSh {order.total_amount.toLocaleString()}
            </span>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>
              Transaction:{' '}
              <span className="text-foreground font-medium">
                {order.transaction_code}
              </span>
            </p>
            <p>
              Phone:{' '}
              <span className="text-foreground font-medium">
                {order.phone_number}
              </span>
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="block text-center py-3 rounded-lg border border-border hover:border-primary transition-colors"
        >
          Continue Shopping
        </Link>

      </main>
    </div>
  );
};

export default OrderConfirmationPage;