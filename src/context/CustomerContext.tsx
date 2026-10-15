import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

      const { data } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', savedId)
        .single();

      if (data) setCustomer(data);
      else localStorage.removeItem(STORAGE_KEY); // stale id
      setLoading(false);
    };
    restore();
  }, []);

  // Sign in by email OR username
  const signIn = async (identifier: string): Promise<{ error: string | null }> => {
    const val = identifier.trim().toLowerCase();
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .or(`email.eq.${val},username.eq.${val}`)
      .single();

    if (error || !data) return { error: 'No account found. Check your email or username.' };

    localStorage.setItem(STORAGE_KEY, data.id);
    setCustomer(data);
    return { error: null };
  };

  // Create a new profile
  const signUp = async (username: string, email: string): Promise<{ error: string | null }> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check for duplicates
    const { data: existing } = await supabase
      .from('customer_profiles')
      .select('id, email, username')
      .or(`email.eq.${cleanEmail},username.eq.${cleanUsername}`)
      .maybeSingle();

    if (existing) {
      if (existing.email === cleanEmail) return { error: 'That email is already registered. Try signing in.' };
      if (existing.username === cleanUsername) return { error: 'That username is taken. Try another.' };
    }

    const { data, error } = await supabase
      .from('customer_profiles')
      .insert({ username: cleanUsername, email: cleanEmail })
      .select()
      .single();

    if (error || !data) return { error: 'Could not create account. Try again.' };

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