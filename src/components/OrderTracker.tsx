import { OrderStatus } from '@/types';
import { Check, Bike } from 'lucide-react';
import { useState } from 'react';
import AssignRiderModal from '@/components/AssignRiderModal';

const steps: { status: OrderStatus; label: string }[] = [
  { status: 'pending_verification', label: 'Pending' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'processing', label: 'Processing' },
  { status: 'out_for_delivery', label: 'On the Way' },
  { status: 'delivered', label: 'Delivered' },
];

const orderFlow: OrderStatus[] = [
  'pending_verification',
  'confirmed',
  'processing',
  'out_for_delivery',
  'delivered',
];

type Props = {
  status: OrderStatus;
  orderId?: string;    // needed for assigning rider
  isAdmin?: boolean;   // controls admin features
  onRiderAssigned?: () => void; // optional refresh callback
};

const OrderTracker = ({
  status,
  orderId,
  isAdmin = false,
  onRiderAssigned,
}: Props) => {
  const [showModal, setShowModal] = useState(false);

  if (status === 'rejected') {
    return (
      <div className="text-center py-4">
        <span className="text-red-500 font-medium">Order Rejected</span>
      </div>
    );
  }

  const currentIndex = orderFlow.indexOf(status);

  // Admin can assign a rider when order is in 'processing' state
  // (or already out_for_delivery to re-assign)
  const canAssignRider =
    isAdmin &&
    orderId &&
    (status === 'processing' || status === 'out_for_delivery');

  return (
    <div className="w-full py-6 space-y-4">

      {/* PROGRESS TRACKER */}
      <div className="flex items-center justify-between relative">

        {/* BACKGROUND TRACK */}
        <div className="absolute top-3 left-0 right-0 h-[2px] bg-border" />

        {/* FILLED TRACK */}
        <div
          className="absolute top-3 left-0 h-[2px] bg-primary transition-all duration-500"
          style={{
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div
              key={step.status}
              className="flex flex-col items-center flex-1 relative z-10"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                  isDone
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : isActive
                    ? 'border-2 border-primary bg-background scale-110'
                    : 'border border-border bg-background'
                }`}
              >
                {isDone && <Check className="w-4 h-4" />}
              </div>

              <span
                className={`text-[11px] mt-2 transition-all text-center ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ADMIN: ASSIGN RIDER BUTTON */}
      {canAssignRider && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Bike className="w-4 h-4" />
            {status === 'out_for_delivery' ? 'Reassign Rider' : 'Assign Rider'}
          </button>
        </div>
      )}

      {/* ASSIGN RIDER MODAL */}
      {showModal && orderId && (
        <AssignRiderModal
          orderId={orderId}
          onClose={() => setShowModal(false)}
          onAssigned={() => {
            setShowModal(false);
            onRiderAssigned?.();
          }}
        />
      )}
    </div>
  );
};

export default OrderTracker;