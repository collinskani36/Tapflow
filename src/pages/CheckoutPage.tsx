import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, LogIn } from 'lucide-react';
import Header from '@/components/Header';
import CustomerAuthModal from '@/components/CustomerAuthModal';
import { useCart } from '@/context/CartContext';
import { useCustomer } from '@/context/CustomerContext';
import { DeliveryLocation } from '@/types';
import { fetchLocations } from '@/lib/supabase';

const CheckoutPage = () => {
  const { items, subtotal } = useCart();
  const { customer } = useCustomer();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');

    const loadLocations = async () => {
      const data = await fetchLocations();
      setLocations(data || []);
    };

    loadLocations();
  }, [items, navigate]);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const deliveryFee = selectedLocation ? Number(selectedLocation.delivery_fee) : 0;
  const safeSubtotal = Number(subtotal) || 0;
  const total = safeSubtotal + deliveryFee;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !locationId) return;

    sessionStorage.setItem(
      'checkout',
      JSON.stringify({
        phone,
        locationId,
        description,
        total,
        deliveryFee,
        // attach customer id if signed in — PaymentPage should read this and save to the order
        customerId: customer?.id ?? null,
      })
    );

    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-display text-2xl text-foreground">Checkout</h1>

        {/* ── Customer account nudge (only for guests) ── */}
        {!customer && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-secondary/40">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">Track your orders</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in or create a free account to view order history and save your delivery locations.
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:opacity-80 transition-opacity"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
          </div>
        )}

        {/* ── Signed-in greeting ── */}
        {customer && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-primary-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ordering as{' '}
              <span className="text-foreground font-medium">@{customer.username}</span>
              {' '}— this order will be saved to your history.
            </p>
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-5">
          {/* Phone */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Phone Number *</label>
            <input
              type="tel"
              required
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Delivery Location *</label>

            {locations.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                <MapPin className="w-4 h-4" />
                No delivery locations set up yet.
              </div>
            ) : (
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} — KSh {Number(loc.delivery_fee).toLocaleString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Location Description (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., near stage, blue gate"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Summary */}
          <div className="glass-card rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>KSh {safeSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Fee</span>
              <span>KSh {deliveryFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground text-base">
              <span>Total</span>
              <span className="gold-text">KSh {total.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Continue to Payment
          </button>
        </form>
      </main>

      <CustomerAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default CheckoutPage;