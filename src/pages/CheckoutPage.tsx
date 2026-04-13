import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { DeliveryLocation } from '@/types';
import { fetchLocations } from '@/lib/supabase';

const CheckoutPage = () => {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (items.length === 0) navigate('/cart');

    const loadLocations = async () => {
      const data = await fetchLocations();
      setLocations(data || []);
    };

    loadLocations();
  }, [items, navigate]);

  // ✅ Find selected location
  const selectedLocation = locations.find((l) => l.id === locationId);

  // ✅ FIX: use correct field (delivery_fee)
  const deliveryFee = selectedLocation
    ? Number(selectedLocation.delivery_fee)
    : 0;

  // ✅ Ensure subtotal is a number
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

        <h1 className="font-display text-2xl text-foreground">
          Checkout
        </h1>

        <form onSubmit={handleContinue} className="space-y-5">
          {/* Phone */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Phone Number *
            </label>
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
            <label className="text-sm text-muted-foreground mb-1 block">
              Delivery Location *
            </label>

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
              <span className="gold-text">
                KSh {total.toLocaleString()}
              </span>
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
    </div>
  );
};

export default CheckoutPage;