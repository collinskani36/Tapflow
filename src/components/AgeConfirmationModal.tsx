import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface AgeConfirmationModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AgeConfirmationModal = ({ open, onConfirm, onCancel }: AgeConfirmationModalProps) => {
  const [checked, setChecked] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card rounded-xl p-6 max-w-sm w-full space-y-5 text-center border border-primary/20"
          >
            <div className="mx-auto w-14 h-14 rounded-full gold-gradient flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl text-foreground">Age Verification</h2>
            <p className="text-muted-foreground text-sm">
              You must be <span className="text-primary font-semibold">18 years or older</span> to order alcohol. This is a legal requirement.
            </p>
            <label className="flex items-center gap-3 cursor-pointer justify-center text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="w-5 h-5 rounded border-border accent-primary"
              />
              <span className="text-foreground">I confirm I am 18 years or older</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (checked) onConfirm(); }}
                disabled={!checked}
                className="flex-1 py-2.5 rounded-lg gold-gradient text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgeConfirmationModal;
