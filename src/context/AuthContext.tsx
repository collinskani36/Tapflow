// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

type UserRole = 'admin' | 'rider' | 'client' | null;

interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  riderProfile: RiderProfile | null;
  isAdmin: boolean;
  isRider: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user role and rider profile
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      // Get role from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, rider_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return { role: null, riderProfile: null };
      }

      console.log('📋 Profile data:', profileData);

      const userRole = profileData?.role as UserRole || 'client';
      let riderProfileData = null;

      // If role is rider, fetch rider details
      if (userRole === 'rider' && profileData?.rider_id) {
        console.log('🔄 Fetching rider details for ID:', profileData.rider_id);
        const { data: riderData, error: riderError } = await supabase
          .from('riders')
          .select('*')
          .eq('id', profileData.rider_id)
          .single();

        if (riderError) {
          console.error('❌ Error fetching rider:', riderError);
        } else if (riderData) {
          console.log('✅ Rider data found:', riderData);
          riderProfileData = riderData;
        }
      }

      console.log('✅ Profile fetch complete. Role:', userRole);
      return { role: userRole, riderProfile: riderProfileData };
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      return { role: null, riderProfile: null };
    }
  };

  // ============================================================
  // 🔥 PERSIST SESSION ON LOAD
  // ============================================================
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          return;
        }

        if (data.session?.user) {
          console.log('✅ Session found for user:', data.session.user.email);
          setUser(data.session.user);
          const { role: userRole, riderProfile: riderData } = await fetchUserProfile(data.session.user.id);
          setRole(userRole);
          setRiderProfile(riderData);
        } else {
          console.log('ℹ️ No active session');
        }
      } catch (error) {
        console.error('❌ Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // ============================================================
    // 🔥 LISTEN TO AUTH CHANGES (LOGIN / LOGOUT)
    // ============================================================
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('🔄 Auth state changed:', _event);
        
        if (session?.user) {
          console.log('✅ User logged in:', session.user.email);
          setUser(session.user);
          const { role: userRole, riderProfile: riderData } = await fetchUserProfile(session.user.id);
          setRole(userRole);
          setRiderProfile(riderData);
        } else {
          console.log('👋 User logged out');
          setUser(null);
          setRole(null);
          setRiderProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        return { success: false };
      }

      if (!data.user) {
        console.error('❌ No user returned from login');
        return { success: false };
      }

      console.log('✅ Login successful for:', data.user.email);

      // Fetch the user's profile to get role
      const { role: userRole } = await fetchUserProfile(data.user.id);
      
      console.log('✅ User role:', userRole);

      // Request notification permission if rider
      if (userRole === 'rider' && 'Notification' in window) {
        try {
          const permission = await Notification.requestPermission();
          console.log('📢 Notification permission:', permission);
        } catch (notifError) {
          console.log('ℹ️ Notification permission skipped:', notifError);
        }
      }

      return { success: true, role: userRole || 'client' };
    } catch (error) {
      console.error('❌ Unexpected login error:', error);
      return { success: false };
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  // ============================================================
  // REFRESH PROFILE (useful after updates)
  // ============================================================
  const refreshProfile = async () => {
    if (!user) return;
    console.log('🔄 Refreshing profile...');
    const { role: userRole, riderProfile: riderData } = await fetchUserProfile(user.id);
    setRole(userRole);
    setRiderProfile(riderData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        riderProfile,
        isAdmin: role === 'admin',
        isRider: role === 'rider',
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};