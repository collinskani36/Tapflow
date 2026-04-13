import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔥 PERSIST SESSION ON LOAD
  // ============================================================
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setIsAdmin(true);
      }

      setLoading(false);
    };

    getSession();

    // ============================================================
    // 🔥 LISTEN TO AUTH CHANGES (LOGIN / LOGOUT)
    // ============================================================
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAdmin(!!session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return false;
    }

    return true; // state handled by listener
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};