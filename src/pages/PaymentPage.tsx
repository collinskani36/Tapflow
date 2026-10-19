import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { createOrder, supabase } from '@/lib/supabase';

type PaymentStatus =
  | 'idle'
  | 'initiating'
  | 'waiting' // STK prompt sent, waiting for the customer
  | 'delayed' // still waiting past the normal window (we keep checking)
  | 'submitting' // paid, order being created
  | 'review' // paid but needs manual verification (e.g. wrong amount)
  | 'success'
  | 'failed';

const POLL_INTERVAL_MS = 2500;
const DELAYED_AFTER_MS = 90_000; // show the "still waiting" message, keep polling
const GIVE_UP_AFTER_MS = 15 * 60_000; // stop polling; payment may still be reconciled server-side
const PENDING_KEY = 'pendingPayment';

// Manual Till-code entry. Temporary: used for demos until live STK prompting is on.
// Set VITE_ENABLE_MANUAL_PAYMENT=false to hide it.
const MANUAL_ENABLED = import.meta.env.VITE_ENABLE_MANUAL_PAYMENT !== 'false';
const DEMO_TILL = '234567'; // TODO: replace with the real Till before production

// The edge function returns user-safe messages as { error } on 4xx/5xx; supabase-js
// hides the body inside error.context, so read it from there.
async function readFunctionError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.clone === 'function') {
    try {
      const body = await ctx.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      /* not JSON */
    }
  }
  return null;
}

// Daraja failure texts are technical; show something a customer can act on.
function friendlyFailure(reason?: string | null): string {
  const r = reason ?? '';
  if (/cancel/i.test(r)) return 'You cancelled the payment request.';
  if (/insufficient|balance/i.test(r)) return 'Your M-Pesa balance is too low for this order.';
  if (/pin/i.test(r)) return 'The M-Pesa PIN was incorrect.';
  if (/timeout|timed out|unreachable|not responded/i.test(r)) {
    return 'The request timed out before it was completed. Please try again.';
  }
  return 'The payment was not completed. You have not been charged.';
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const checkout = JSON.parse(sessionStorage.getItem('checkout') || '{}');
  const estimatedTotal = Number(checkout.total ?? subtotal) || 0;
  const phone = checkout.phone as string | undefined;

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState(estimatedTotal); // replaced by the server's figure after initiate
  const [receipt, setReceipt] = useState<string | null>(null);

  // Manual payment (customer paid via Till without using the STK prompt)
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const payLockRef = useRef(false);

  const stopPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => stopPolling, []);

  // ── Resume a payment that was in progress when the page was reloaded ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as { id: string; startedAt: number; amount: number };
      if (!pending?.id || Date.now() - pending.startedAt > GIVE_UP_AFTER_MS) {
        localStorage.removeItem(PENDING_KEY);
        return;
      }
      payLockRef.current = true;
      setAmount(Number(pending.amount) || estimatedTotal);
      setStatus('waiting');
      startPolling(pending.id, pending.startedAt);
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Success: the server already created the order. Just go to it. ──
  const finishSuccess = (orderId: string) => {
    stopPolling();
    localStorage.removeItem(PENDING_KEY);
    sessionStorage.setItem('lastOrder', JSON.stringify({ id: orderId }));
    sessionStorage.removeItem('checkout');
    clearCart();
    setStatus('success');
    navigate('/order-confirmation');
  };

  const fail = (message: string) => {
    stopPolling();
    localStorage.removeItem(PENDING_KEY);
    payLockRef.current = false;
    setStatus('failed');
    setErrorMessage(message);
  };

  const startPolling = (id: string, startedAt: number) => {
    stopPolling();

    const tick = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const elapsed = Date.now() - startedAt;

        if (elapsed > GIVE_UP_AFTER_MS) {
          fail(
            "We couldn't confirm your payment. If M-Pesa charged you, please contact support — do not pay again."
          );
          return;
        }

        const { data, error } = await supabase.rpc('get_payment_status', { transaction_id: id });
        if (error) {
          console.error('Polling error:', error);
          return; // transient — keep polling
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return;

        if (row.status === 'success') {
          if (row.order_id) {
            finishSuccess(row.order_id);
          } else {
            // Paid; the order is being created (the server retries automatically)
            setReceipt(row.mpesa_receipt ?? null);
            setStatus('submitting');
          }
        } else if (row.status === 'failed' || row.status === 'expired') {
          fail(friendlyFailure(row.failure_reason));
        } else if (row.status === 'needs_review') {
          stopPolling();
          localStorage.removeItem(PENDING_KEY);
          setReceipt(row.mpesa_receipt ?? null);
          setStatus('review');
        } else if (elapsed > DELAYED_AFTER_MS) {
          setStatus((prev) => (prev === 'waiting' ? 'delayed' : prev));
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    tick();
    pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
  };

  const handlePay = async () => {
    if (payLockRef.current) return; // guards double taps
    if (!phone) {
      setErrorMessage('Missing phone number — please go back to checkout.');
      setStatus('failed');
      return;
    }

    payLockRef.current = true;
    setStatus('initiating');
    setErrorMessage('');

    // The server prices the cart from the database. We send WHAT is being bought,
    // never how much it costs.
    const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
      body: {
        phone,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          size: i.variantSize ?? null,
        })),
        location_id: checkout.locationId ?? null,
        delivery_lat: checkout.deliveryLat ?? null,
        delivery_lng: checkout.deliveryLng ?? null,
        delivery_address: checkout.deliveryAddress ?? null,
        location_description: checkout.description ?? null,
        customer_id: checkout.customerId ?? null,
      },
    });

    if (error || !data?.id) {
      const message = (await readFunctionError(error)) ?? data?.error ?? null;
      fail(message || 'Failed to start payment. Please try again.');
      return;
    }

    const serverAmount = Number(data.amount) || estimatedTotal;
    const startedAt = Date.now();
    setAmount(serverAmount);
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ id: data.id, startedAt, amount: serverAmount })
    );
    setStatus('waiting');
    startPolling(data.id, startedAt);
  };

  // ── Manual Till-code path (temporary; closed once live STK prompting is on) ──
  const finalizeManualOrder = async (code: string) => {
    setStatus('submitting');
    try {
      const order = await createOrder({
        phone_number: checkout.phone,
        location_id: checkout.locationId ?? null,
        location_description: checkout.description,
        transaction_code: code.toUpperCase(),
        customer_id: checkout.customerId ?? null,
        delivery_lat: checkout.deliveryLat ?? null,
        delivery_lng: checkout.deliveryLng ?? null,
        delivery_address: checkout.deliveryAddress ?? null,
        distance_km: checkout.distanceKm ?? null,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          size: i.variantSize ?? null,
          variant_price: i.variantPrice ?? null,
        })),
      });

      sessionStorage.setItem('lastOrder', JSON.stringify(order));
      sessionStorage.removeItem('checkout');
      clearCart();
      navigate('/order-confirmation');
    } catch (err) {
      console.error('Manual order submission failed:', err);
      payLockRef.current = false;
      setStatus('failed');
      setErrorMessage(
        'We could not save your order with that code. Check the code and try again, or contact support.'
      );
    }
  };

  const handleCopyTill = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_TILL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can still read the number
    }
  };

  const manualCodeValid = /^[A-Z0-9]{10}$/.test(manualCode);

  const handleManualConfirm = () => {
    if (!manualCodeValid || payLockRef.current) return;
    payLockRef.current = true;
    finalizeManualOrder(manualCode);
  };

  const handleRetry = () => {
    stopPolling();
    localStorage.removeItem(PENDING_KEY);
    payLockRef.current = false;
    setErrorMessage('');
    setReceipt(null);
    setStatus('idle');
  };

  const isBusy =
    status === 'initiating' ||
    status === 'waiting' ||
    status === 'delayed' ||
    status === 'submitting';

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
            <p className="text-2xl font-bold text-foreground">KSh {amount.toLocaleString()}</p>
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
              Pay KSh {amount.toLocaleString()}
            </button>
          )}

          {/* Manual payment option */}
          {status === 'idle' && MANUAL_ENABLED && (
            <div className="space-y-3">
              {!showManual ? (
                <button
                  onClick={() => setShowManual(true)}
                  className="w-full text-sm text-muted-foreground underline hover:text-foreground"
                >
                  Paid manually? Enter M-Pesa code
                </button>
              ) : (
                <div className="bg-secondary rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Pay KSh {amount.toLocaleString()} to Till
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold tracking-widest text-foreground">
                      {DEMO_TILL}
                    </span>
                    <button
                      onClick={handleCopyTill}
                      aria-label="Copy till number"
                      className="p-1.5 rounded-md hover:bg-background text-muted-foreground"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    value={manualCode}
                    onChange={(e) =>
                      setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
                    }
                    placeholder="M-Pesa code e.g. SJK4X9ABCD"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-primary/10 text-center tracking-widest uppercase"
                  />
                  <button
                    onClick={handleManualConfirm}
                    disabled={!manualCodeValid}
                    className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium disabled:opacity-40"
                  >
                    Confirm order
                  </button>
                </div>
              )}
            </div>
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

          {/* Taking longer than usual — keep checking, tell the customer not to pay again */}
          {status === 'delayed' && (
            <div className="text-center space-y-3 py-2">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-foreground font-medium">Still waiting for M-Pesa…</p>
              <p className="text-sm text-muted-foreground">
                If you have entered your PIN, hang tight: your order will appear automatically.
                Please don&apos;t pay again.
              </p>
            </div>
          )}

          {/* Payment confirmed; order being created */}
          {status === 'submitting' && (
            <div className="text-center space-y-2 py-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Payment received — saving your order…
              </div>
              {receipt && (
                <p className="text-xs text-muted-foreground">Receipt: {receipt}</p>
              )}
            </div>
          )}

          {/* Paid, but something needs a human (e.g. amount mismatch) */}
          {status === 'review' && (
            <div className="text-center space-y-3 py-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-primary" />
              <p className="text-foreground font-medium">We received your payment</p>
              <p className="text-sm text-muted-foreground">
                We need to verify it before confirming your order. Please contact support
                {receipt ? ` with receipt ${receipt}` : ''} — do not pay again.
              </p>
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
