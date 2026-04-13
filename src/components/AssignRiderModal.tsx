import { useState, useEffect, useRef } from 'react';
import { X, Bike, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Rider {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  orderId: string;
  onClose: () => void;
  onAssigned?: () => void; // optional callback after successful assignment
}

export default function AssignRiderModal({ orderId, onClose, onAssigned }: Props) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load riders
  useEffect(() => {
    supabase
      .from('riders')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setRiders(data || []);
        setLoading(false);
      });
  }, []);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Assign rider and update status to out_for_delivery
  const handleAssign = async () => {
    if (!selected) {
      setError('Please select a rider.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        rider_id: selected,
        status: 'out_for_delivery',
      })
      .eq('id', orderId);

    if (updateError) {
      setError('Failed to assign rider. Please try again.');
      setSaving(false);
      return;
    }

    setDone(true);
    setSaving(false);

    // Auto-close after brief success state
    setTimeout(() => {
      onAssigned?.();
      onClose();
    }, 1200);
  };

  const selectedRider = riders.find((r) => r.id === selected);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm shadow-xl">

        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Assign Rider
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 space-y-4">

          {done ? (
            // SUCCESS STATE
            <div className="text-center py-4 space-y-2">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">Rider Assigned!</p>
              <p className="text-xs text-muted-foreground">
                Order status updated to <span className="text-primary font-medium">Out for Delivery</span>
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Select a rider to dispatch this order. The status will automatically update to{' '}
                <span className="text-foreground font-medium">Out for Delivery</span>.
              </p>

              {/* RIDER SELECT */}
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : riders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No riders registered yet. Add riders in the Riders tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {riders.map((rider) => (
                    <label
                      key={rider.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected === rider.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rider"
                        value={rider.id}
                        checked={selected === rider.id}
                        onChange={() => {
                          setSelected(rider.id);
                          setError('');
                        }}
                        className="accent-primary"
                      />

                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bike className="w-4 h-4 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{rider.name}</p>
                        <p className="text-xs text-muted-foreground">{rider.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!done && riders.length > 0 && (
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>

            <button
              onClick={handleAssign}
              disabled={saving || !selected}
              className="flex-1 py-2.5 rounded-xl gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bike className="w-4 h-4" />
              )}
              {saving ? 'Assigning…' : `Assign${selectedRider ? ` ${selectedRider.name.split(' ')[0]}` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}