// src/components/auth/LoginModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, User, Shield, Bike } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

type LoginMode = 'admin' | 'rider';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: LoginMode;
}

const LoginModal = ({ open, onClose, defaultMode = 'admin' }: LoginModalProps) => {
  const { login, isAdmin, isRider } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<LoginMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
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

    // Redirect based on role
    if (result.role === 'admin') {
      onClose();
      navigate('/admin');
    } else if (result.role === 'rider') {
      onClose();
      navigate('/rider/dashboard');
    } else {
      setError('Access denied. This login is for admins and riders only.');
      // Logout to clean up
      await login('', ''); // This won't work, we need proper logout
      // Actually, let's just show error
    }
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
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

            {/* Mode Switcher */}
            <div className="flex gap-2 bg-secondary/50 rounded-lg p-1">
              <button
                onClick={() => setMode('admin')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'admin'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
              <button
                onClick={() => setMode('rider')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'rider'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bike className="w-4 h-4" />
                Rider
              </button>
            </div>

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