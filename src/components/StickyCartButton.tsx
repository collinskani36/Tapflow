import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const StickyCartButton = () => {
  const { totalItems, subtotal } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-40 md:hidden"
        >
          <Link
            to="/cart"
            className="flex items-center justify-between gold-gradient text-primary-foreground rounded-xl px-5 py-3.5 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            </div>
            <span className="font-bold">KSh {subtotal.toLocaleString()}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCartButton;
