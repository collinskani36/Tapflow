import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { createOrder } from '@/lib/supabase';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [txCode, setTxCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkout = JSON.parse(sessionStorage.getItem('checkout') || '{}');

  // 🔥 IMPORTANT: fallback safety
  const total = Number(checkout.total ?? subtotal) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCode.trim()) return;

    try {
      setSubmitting(true);

      // 🔥 ONLY CHANGE: match RPC backend structure
      const order = await createOrder({
        phone_number: checkout.phone,
        location_id: checkout.locationId,
        location_description: checkout.description,
        transaction_code: txCode.trim().toUpperCase(),

        // ❌ NO PRICES SENT (backend handles everything now)
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      });

      sessionStorage.setItem('lastOrder', JSON.stringify(order));
      sessionStorage.removeItem('checkout');
      clearCart();

      navigate('/order-confirmation');

    } catch (error) {
      console.error('Order submission failed:', error);
      alert('Failed to submit order. Please try again.');

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card rounded-xl p-6 space-y-5 border border-primary/10">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full gold-gradient flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl text-foreground">
              Pay via M-Pesa
            </h1>
            <p className="text-muted-foreground text-sm">Buy Goods</p>
          </div>

          {/* Till (UNCHANGED) */}
          <div className="bg-secondary rounded-lg p-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Till Number</p>
            <p className="text-3xl font-bold gold-text tracking-wider">
              123456
            </p>
          </div>

          {/* Amount (UNCHANGED) */}
          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-2xl font-bold text-foreground">
              KSh {total.toLocaleString()}
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            After paying, enter the M-Pesa transaction code below.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Transaction Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., SHK3XXXXXX"
                value={txCode}
                onChange={(e) => setTxCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !txCode.trim()}
              className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;