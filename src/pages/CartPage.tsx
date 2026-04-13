import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Header from '@/components/Header';
import CartItemRow from '@/components/CartItemRow';
import AgeConfirmationModal from '@/components/AgeConfirmationModal';
import { useCart } from '@/context/CartContext';

const CartPage = () => {
  const { items, subtotal, totalItems } = useCart();
  const [showAge, setShowAge] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (items.length === 0) return;
    setShowAge(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 max-w-lg mx-auto space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
        <h1 className="font-display text-2xl text-foreground">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Your cart is empty</p>
            <Link to="/" className="inline-block text-primary text-sm hover:underline">Browse products</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.product.id} {...item} />
              ))}
            </div>
            <div className="glass-card rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{totalItems} item{totalItems > 1 ? 's' : ''}</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground text-lg">
                <span>Subtotal</span>
                <span className="gold-text">KSh {subtotal.toLocaleString()}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-3 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </main>

      <AgeConfirmationModal
        open={showAge}
        onConfirm={() => { setShowAge(false); navigate('/checkout'); }}
        onCancel={() => setShowAge(false)}
      />
    </div>
  );
};

export default CartPage;
