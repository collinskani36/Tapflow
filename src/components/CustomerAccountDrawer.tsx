import { useState } from 'react';
import { X, LogOut, History, MapPin, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomer } from '@/context/CustomerContext';
import CustomerOrderHistory from '@/components/CustomerOrderHistory';
import CustomerSavedLocations from '@/components/CustomerSavedLocations';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'orders' | 'locations';

const CustomerAccountDrawer = ({ open, onClose }: Props) => {
  const { customer, signOut } = useCustomer();
  const [tab, setTab] = useState<Tab>('orders');

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:inset-0 md:m-auto z-50 md:max-w-md md:max-h-[85vh] md:rounded-2xl rounded-t-2xl bg-background flex flex-col"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 md:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">@{customer?.username}</p>
                  <p className="text-xs text-muted-foreground">{customer?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/40 shrink-0">
              <button
                onClick={() => setTab('orders')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  tab === 'orders'
                    ? 'text-primary border-b-2 border-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-4 h-4" /> Orders
              </button>
              <button
                onClick={() => setTab('locations')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  tab === 'locations'
                    ? 'text-primary border-b-2 border-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="w-4 h-4" /> Locations
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'orders' ? <CustomerOrderHistory /> : <CustomerSavedLocations />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomerAccountDrawer;