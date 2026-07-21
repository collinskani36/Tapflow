// src/components/rider/RiderLayout.tsx
import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, History, User, LogOut, Bike } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface RiderLayoutProps {
  children: ReactNode;
}

const RiderLayout = ({ children }: RiderLayoutProps) => {
  const { riderProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { path: '/rider/dashboard', icon: LayoutDashboard, label: 'Active' },
    { path: '/rider/history', icon: History, label: 'History' },
    { path: '/rider/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/rider/dashboard" className="flex items-center gap-2">
            <Bike className="w-6 h-6 text-primary" />
            <span className="font-display text-lg text-foreground hidden sm:inline">
              Cheers Delivery
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {riderProfile && (
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-foreground leading-tight">
                  {riderProfile.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {riderProfile.phone}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-4 max-w-2xl mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-border">
        <div className="container max-w-2xl mx-auto flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 group"
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="rider-nav-indicator"
                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card rounded-xl p-6 max-w-sm w-full space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-foreground">Logout</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to logout from your rider account?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RiderLayout;