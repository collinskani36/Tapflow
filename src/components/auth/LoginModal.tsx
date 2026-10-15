// src/components/auth/LoginModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Shield, Bike } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

type LoginMode = 'admin' | 'rider';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: LoginMode;
}

const LoginModal = ({ open, onClose, defaultMode = 'admin' }: LoginModalProps) => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  // Mode is locked to whatever the header trigger opened this with — the
  // bike icon opens rider-only, triple-tapping the logo opens admin-only.
  // There is intentionally no in-modal switcher, so one entry point can't
  // be used to reach the other role's login.
  const mode: LoginMode = defaultMode;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset fields whenever the modal opens (including if it's reopened in a different mode)
  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setError('');
    }
  }, [open, defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (!result.success) {
      setError('Invalid credentials');
      return;
    }

    // Guard: the credentials were valid, but the account's role doesn't
    // match the login surface it was submitted on (e.g. a rider account
    // used on the admin-only modal, or vice versa).
    if (result.role !== mode) {
      setError(
        mode === 'admin'
          ? 'Access denied. This login is for admins only.'
          : 'Access denied. This login is for riders only.'
      );
      await logout();
      return;
    }

    onClose();
    navigate(mode === 'admin' ? '/admin' : '/rider/dashboard');
  };

  const modeIcon = mode === 'admin' ? <Shield className="w-5 h-5 text-primary" /> : <Bike className="w-5 h-5 text-primary" />;
  const modeTitle = mode === 'admin' ? 'Admin Login' : 'Rider Login';
  const modeSubtitle = mode === 'admin' ? 'Access the admin dashboard' : 'Access your delivery dashboard';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Raised above LocationPicker's map (which is isolated into its
          // own stacking context, capped effectively at page z ~0) so this
          // reliably renders on top regardless of where it's mounted.
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card rounded-xl p-6 max-w-sm w-full space-y-5 border border-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {modeIcon}
                <h2 className="font-display text-xl text-foreground">{modeTitle}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground -mt-2">{modeSubtitle}</p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg gold-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-center">
              {mode === 'admin' ? 'Admin access only' : 'Rider delivery portal'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;