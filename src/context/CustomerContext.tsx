import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { customerSignIn, customerSignUp, getCustomerProfile } from '@/lib/customerApi';

export interface CustomerProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

interface CustomerContextType {
  customer: CustomerProfile | null;
  loading: boolean;
  signIn: (identifier: string) => Promise<{ error: string | null }>;
  signUp: (username: string, email: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const STORAGE_KEY = 'cheers_customer_id';

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const restore = async () => {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (!savedId) { setLoading(false); return; }

      const data = await getCustomerProfile(savedId).catch(() => null);

      if (data) setCustomer(data);
      else localStorage.removeItem(STORAGE_KEY); // stale id
      setLoading(false);
    };
    restore();
  }, []);

  // Sign in by email OR username
  const signIn = async (identifier: string): Promise<{ error: string | null }> => {
    let data: CustomerProfile | null = null;
    try {
      data = await customerSignIn(identifier);
    } catch {
      return { error: 'Could not sign in right now. Check your connection and try again.' };
    }

    if (!data) return { error: 'No account found. Check your email or username.' };

    localStorage.setItem(STORAGE_KEY, data.id);
    setCustomer(data);
    return { error: null };
  };

  // Create a new profile
  const signUp = async (username: string, email: string): Promise<{ error: string | null }> => {
    let result: Awaited<ReturnType<typeof customerSignUp>>;
    try {
      result = await customerSignUp(username, email);
    } catch {
      return { error: 'Could not create account. Try again.' };
    }

    if (result.error) {
      const messages: Record<string, string> = {
        invalid_username: 'Username must be 2 to 40 characters.',
        invalid_email: 'Enter a valid email address.',
        email_taken: 'That email is already registered. Try signing in.',
        username_taken: 'That username is taken. Try another.',
      };
      return { error: messages[result.error] ?? 'Could not create account. Try again.' };
    }

    const data = result.profile;
    if (!data) return { error: 'Could not create account. Try again.' };

    localStorage.setItem(STORAGE_KEY, data.id);
    setCustomer(data);
    return { error: null };
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
  };

  return (
    <CustomerContext.Provider value={{ customer, loading, signIn, signUp, signOut }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used inside CustomerProvider');
  return ctx;
};