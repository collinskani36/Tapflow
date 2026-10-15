import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { createOrder, supabase } from '@/lib/supabase';

type PaymentStatus = 'idle' | 'initiating' | 'waiting' | 'submitting' | 'success' | 'failed';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 90_000; // matches typical STK prompt expiry

const PaymentPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [txId, setTxId] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const checkout = JSON.parse(sessionStorage.getItem('checkout') || '{}');
  const total = Number(checkout.total ?? subtotal) || 0;
  const phone = checkout.phone as string | undefined;

  const clearTimers = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  useEffect(() => clearTimers, []);

  const finalizeOrder = async (mpesaReceipt: string) => {
    setStatus('submitting');
    try {
      const order = await createOrder({
        phone_number: checkout.phone,
        location_id: checkout.locationId ?? null,
        location_description: checkout.description,
        transaction_code: mpesaReceipt.toUpperCase(),
        customer_id: checkout.customerId ?? null,
        delivery_lat: checkout.deliveryLat ?? null,
        delivery_lng: checkout.deliveryLng ?? null,
        delivery_address: checkout.deliveryAddress ?? null,
        distance_km: checkout.distanceKm ?? null,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          variant_price: i.variantPrice ?? null,
        })),
      });

      sessionStorage.setItem('lastOrder', JSON.stringify(order));
      sessionStorage.removeItem('checkout');
      clearCart();
      navigate('/order-confirmation');
    } catch (error) {
      console.error('Order submission failed after successful payment:', error);
      // Payment succeeded but order save failed — this needs a support path,
      // not a generic retry, since re-paying would double-charge the customer.
      setStatus('failed');
      setErrorMessage(
        `Your payment went through (receipt ${mpesaReceipt}) but we couldn't save your order. Please contact support with this receipt number.`
      );
    }
  };

  const startPolling = (id: string) => {
    clearTimers();

    pollRef.current = window.setInterval(async () => {
      const { data, error } = await supabase.rpc('get_payment_status', {
        transaction_id: id,
      });

      if (error) {
        console.error('Polling error:', error);
        return; // transient — keep polling until timeout
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;

      if (row.status === 'success') {
        clearTimers();
        finalizeOrder(row.mpesa_receipt);
      } else if (row.status === 'failed') {
        clearTimers();
        setStatus('failed');
        setErrorMessage(row.failure_reason || 'Payment was not completed.');
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = window.setTimeout(() => {
      clearTimers();
      setStatus('failed');
      setErrorMessage("We didn't receive a response in time. Please try again.");
    }, TIMEOUT_MS);
  };

  const handlePay = async () => {
    if (!phone) {
      setErrorMessage('Missing phone number — please go back to checkout.');
      setStatus('failed');
      return;
    }

    setStatus('initiating');
    setErrorMessage('');

    const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
      body: { phone, amount: total },
    });

    if (error || !data?.id) {
      setStatus('failed');
      setErrorMessage(data?.error || 'Failed to start payment. Please try again.');
      return;
    }

    setTxId(data.id);
    setStatus('waiting');
    startPolling(data.id);
  };

  const handleRetry = () => {
    clearTimers();
    setTxId(null);
    setErrorMessage('');
    setStatus('idle');
  };

  const isBusy = status === 'initiating' || status === 'waiting' || status === 'submitting';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          disabled={isBusy}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card rounded-xl p-6 space-y-5 border border-primary/10">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full gold-gradient flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl text-foreground">Pay via M-Pesa</h1>
            <p className="text-muted-foreground text-sm">Lipa Na M-Pesa</p>
          </div>

          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-2xl font-bold text-foreground">
              KSh {total.toLocaleString()}
            </p>
          </div>

          {phone && (
            <div className="bg-secondary rounded-lg p-4 text-center space-y-1">
              <p className="text-sm text-muted-foreground">Sending prompt to</p>
              <p className="text-lg font-semibold text-foreground tracking-wide">{phone}</p>
            </div>
          )}

          {/* Idle — ready to pay */}
          {status === 'idle' && (
            <button
              onClick={handlePay}
              className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Pay KSh {total.toLocaleString()}
            </button>
          )}

          {/* Initiating STK push */}
          {status === 'initiating' && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending payment request…
            </div>
          )}

          {/* Waiting for customer to enter PIN */}
          {status === 'waiting' && (
            <div className="text-center space-y-3 py-2">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-foreground font-medium">Check your phone</p>
              <p className="text-sm text-muted-foreground">
                Enter your M-Pesa PIN on the prompt to complete payment.
              </p>
            </div>
          )}

          {/* Finalizing the order after payment confirmed */}
          {status === 'submitting' && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Payment received — saving your order…
            </div>
          )}

          {/* Failure / timeout */}
          {status === 'failed' && (
            <div className="text-center space-y-3 py-2">
              <XCircle className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
              <button
                onClick={handleRetry}
                className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success (brief — navigation happens right after) */}
          {status === 'success' && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-primary" />
              <p className="text-foreground font-medium">Payment received</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;