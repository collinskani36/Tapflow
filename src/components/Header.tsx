// src/components/Header.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Wine, User, Bike } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import LoginModal from '@/components/auth/LoginModal'; // Renamed from AdminLoginModal
import CustomerAuthModal from '@/components/CustomerAuthModal';
import CustomerAccountDrawer from '@/components/CustomerAccountDrawer';
import { useAuth } from '@/context/AuthContext';
import { useCustomer } from '@/context/CustomerContext';

const Header = () => {
  const { totalItems } = useCart();
  const { isAdmin, isRider } = useAuth();
  const { customer } = useCustomer();

  const [tapCount, setTapCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'rider'>('admin');
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    if (next >= 5) {
      setLoginMode('admin');
      setShowLoginModal(true);
      setTapCount(0);
    } else {
      setTapCount(next);
      setTimeout(() => setTapCount(0), 2000);
    }
  };

  // New: Rider login trigger - tap on bike icon in header
  const handleRiderTrigger = () => {
    setLoginMode('rider');
    setShowLoginModal(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <button onClick={handleLogoTap} className="flex items-center gap-2 select-none">
            <Wine className="w-6 h-6 text-primary" />
            <span className="font-display text-lg text-foreground hidden sm:inline">Complex Lounge</span>
          </button>

          <nav className="flex items-center gap-3">
            {/* Show admin or rider dashboard link */}
            {isAdmin && (
              <Link to="/admin" className="text-sm text-primary hover:opacity-80 transition-opacity font-medium">
                Dashboard
              </Link>
            )}
            {isRider && (
              <Link to="/rider/dashboard" className="text-sm text-primary hover:opacity-80 transition-opacity font-medium">
                🏍️ Deliveries
              </Link>
            )}

            {/* Rider login trigger - bike icon (only show when not logged in as rider/admin) */}
            {!isAdmin && !isRider && (
              <button
                onClick={handleRiderTrigger}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/5 transition-colors text-xs"
                title="Rider Login"
              >
                <Bike className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rider</span>
              </button>
            )}

            {/* Customer account button */}
            {customer ? (
              <button
                onClick={() => setShowAccount(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
              >
                <div className="w-4 h-4 rounded-full gold-gradient flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
                <span className="text-xs text-primary font-medium hidden sm:inline">
                  @{customer.username}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerAuth(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-xs hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}

            <Link to="/cart" className="relative p-2">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gold-gradient text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Updated login modal */}
      <LoginModal 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        defaultMode={loginMode}
      />
      <CustomerAuthModal open={showCustomerAuth} onClose={() => setShowCustomerAuth(false)} />
      <CustomerAccountDrawer open={showAccount} onClose={() => setShowAccount(false)} />
    </>
  );
};

export default Header;