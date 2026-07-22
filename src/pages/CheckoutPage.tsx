import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, LogIn, List, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import CustomerAuthModal from '@/components/CustomerAuthModal';
import LocationPicker from '@/components/LocationPicker';
import { useCart } from '@/context/CartContext';
import { useCustomer } from '@/context/CustomerContext';
import { DeliveryLocation } from '@/types';
import { fetchLocations, supabase } from '@/lib/supabase';

interface PinLocation {
  lat: number;
  lng: number;
  address: string;
  distanceKm: number; // client-side estimate — display only
  fee: number; // client-side estimate — display only, never charged as-is
}

const CheckoutPage = () => {
  const { items, subtotal } = useCart();
  const { customer } = useCustomer();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // New pin-based flow
  const [pinLocation, setPinLocation] = useState<PinLocation | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [locationId, setLocationId] = useState('');

  // Server-side fee verification state (pin-based flow only)
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');

    const loadLocations = async () => {
      const data = await fetchLocations();
      setLocations(data || []);
    };

    loadLocations();
  }, [items, navigate]);

  const selectedLocation = locations.find((l) => l.id === locationId);

  // Displayed estimate only — the real charge is decided by the Edge
  // Function call in handleContinue right before navigating to payment.
  const deliveryFeeEstimate = useFallback
    ? selectedLocation
      ? Number(selectedLocation.delivery_fee)
      : 0
    : pinLocation?.fee ?? 0;

  const safeSubtotal = Number(subtotal) || 0;
  const totalEstimate = safeSubtotal + deliveryFeeEstimate;

  const hasValidDelivery = useFallback ? !!locationId : !!pinLocation;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !hasValidDelivery) return;

    setVerifyError(null);

    // Fallback dropdown flow: fee comes from the admin-managed
    // DeliveryLocation record already fetched from Supabase, so no extra
    // verification round-trip is needed here.
    if (useFallback) {
      sessionStorage.setItem(
        'checkout',
        JSON.stringify({
          phone,
          description,
          total: totalEstimate,
          deliveryFee: deliveryFeeEstimate,
          customerId: customer?.id ?? null,
          deliveryLat: null,
          deliveryLng: null,
          deliveryAddress: null,
          distanceKm: null,
          locationId,
        })
      );
      navigate('/payment');
      return;
    }

    // Pin-based flow: never trust the client-computed fee. Re-derive it
    // server-side from the raw coordinates via the calculate-delivery-fee
    // Edge Function, and use ONLY that value going forward.
    if (!pinLocation) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
        body: { lat: pinLocation.lat, lng: pinLocation.lng },
      });

      if (error || !data || typeof data.fee !== 'number') {
        setVerifyError(
          "Couldn't confirm your delivery fee. Please check your internet connection and try again."
        );
        return;
      }

      const verifiedFee: number = data.fee;
      const verifiedDistanceKm: number = data.distanceKm ?? pinLocation.distanceKm;
      const verifiedTotal = safeSubtotal + verifiedFee;

      sessionStorage.setItem(
        'checkout',
        JSON.stringify({
          phone,
          description,
          total: verifiedTotal,
          deliveryFee: verifiedFee, // server-verified — this is what gets charged
          customerId: customer?.id ?? null,
          deliveryLat: pinLocation.lat,
          deliveryLng: pinLocation.lng,
          deliveryAddress: pinLocation.address,
          distanceKm: verifiedDistanceKm,
          locationId: null,
        })
      );
      navigate('/payment');
    } catch {
      setVerifyError(
        "Couldn't confirm your delivery fee. Please check your internet connection and try again."
      );
    } finally {
      setVerifying(false);
    }
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

          {/* Delivery location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-muted-foreground block">Delivery Location *</label>
              {!useFallback && (
                <button
                  type="button"
                  onClick={() => setUseFallback(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <List className="w-3 h-3" /> Pick from list instead
                </button>
              )}
            </div>

            {!useFallback ? (
              <LocationPicker
                onConfirm={(data) => {
                  if (data.fee === null) {
                    // Outside delivery range — nudge toward fallback list
                    setPinLocation(null);
                    setUseFallback(true);
                    return;
                  }
                  setVerifyError(null);
                  setPinLocation({
                    lat: data.lat,
                    lng: data.lng,
                    address: data.address,
                    distanceKm: data.distanceKm,
                    fee: data.fee,
                  });
                }}
              />
            ) : (
              <div className="space-y-2">
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
                <button
                  type="button"
                  onClick={() => {
                    setUseFallback(false);
                    setLocationId('');
                  }}
                  className="text-xs text-primary hover:opacity-80"
                >
                  Use map pin instead
                </button>
              </div>
            )}

            {pinLocation && !useFallback && (
              <p className="text-xs text-muted-foreground mt-2">
                Delivering to: {pinLocation.address} (~{pinLocation.distanceKm.toFixed(1)} km)
              </p>
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
              <span>Delivery Fee{!useFallback && ' (est.)'}</span>
              <span>KSh {deliveryFeeEstimate.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground text-base">
              <span>Total</span>
              <span className="gold-text">KSh {totalEstimate.toLocaleString()}</span>
            </div>
            {!useFallback && (
              <p className="text-xs text-muted-foreground pt-1">
                Final delivery fee is confirmed on the next step.
              </p>
            )}
          </div>

          {verifyError && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!hasValidDelivery || verifying}
            className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Confirming delivery fee…' : 'Continue to Payment'}
          </button>
        </form>
      </main>

      <CustomerAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default CheckoutPage;