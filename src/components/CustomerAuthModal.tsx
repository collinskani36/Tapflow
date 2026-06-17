import { useState } from 'react';
import { X, User, Mail, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomer } from '@/context/CustomerContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

const CustomerAuthModal = ({ open, onClose }: Props) => {
  const { signIn, signUp } = useCustomer();

  const [mode, setMode] = useState<Mode>('signin');
  const [identifier, setIdentifier] = useState(''); // signin: email or username
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setIdentifier(''); setUsername(''); setEmail('');
    setError(null); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    let result: { error: string | null };

    if (mode === 'signin') {
      if (!identifier.trim()) { setError('Enter your email or username.'); setLoading(false); return; }
      result = await signIn(identifier);
    } else {
      if (!username.trim() || !email.trim()) { setError('Both fields are required.'); setLoading(false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); setLoading(false); return; }
      result = await signUp(username, email);
    }

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:inset-0 md:m-auto z-50 md:max-w-sm md:max-h-fit md:rounded-2xl rounded-t-2xl bg-background overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 md:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                {mode === 'signin'
                  ? <LogIn className="w-4 h-4 text-primary" />
                  : <UserPlus className="w-4 h-4 text-primary" />
                }
                <span className="font-display text-base text-foreground">
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </span>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mode === 'signin'
                  ? 'Enter your email or username to access your order history and saved locations.'
                  : 'Pick a username and enter your email — no password needed.'}
              </p>

              {/* Fields */}
              {mode === 'signin' ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">
                    Email or Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="you@email.com or @username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="e.g. mwangi254"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2.5 rounded-lg gold-gradient text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {/* Toggle */}
              <p className="text-center text-xs text-muted-foreground">
                {mode === 'signin' ? "Don't have an account?" : 'Already have one?'}{' '}
                <button
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-primary underline underline-offset-2"
                >
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomerAuthModal;