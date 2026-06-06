import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Wine } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import AdminLoginModal from '@/components/AdminLoginModal';
import { useAuth } from '@/context/AuthContext';

const Header = () => {
  const { totalItems } = useCart();
  const { isAdmin } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    if (next >= 5) {
      setShowLogin(true);
      setTapCount(0);
    } else {
      setTapCount(next);
      setTimeout(() => setTapCount(0), 2000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <button onClick={handleLogoTap} className="flex items-center gap-2 select-none">
            <Wine className="w-6 h-6 text-primary" />
            <span className="font-display text-lg text-foreground hidden sm:inline">Cheers Lounge</span>
          </button>

          <nav className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin" className="text-sm text-primary hover:opacity-80 transition-opacity font-medium">
                Dashboard
              </Link>
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
      <AdminLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default Header;
