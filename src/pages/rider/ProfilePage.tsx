// src/pages/rider/ProfilePage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Calendar, Bike, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RiderLayout from '@/components/rider/RiderLayout';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { riderProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!riderProfile) {
    return (
      <RiderLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </RiderLayout>
    );
  }

  const joinedDate = new Date(riderProfile.created_at).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <RiderLayout>
      <div className="space-y-6 pb-20">
        {/* Profile Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 mx-auto rounded-2xl gold-gradient flex items-center justify-center shadow-xl mb-4"
          >
            <Bike className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-2xl text-foreground">{riderProfile.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Delivery Rider</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4 text-center border border-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{riderProfile.phone}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center border border-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{joinedDate}</p>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-2">
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Role</p>
                  <p className="text-xs text-muted-foreground">Rider • Full Access</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-destructive/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-destructive">Logout</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Version Info */}
        <p className="text-center text-[10px] text-muted-foreground/50 pt-4">
          Cheers Delivery v1.0 • Rider Portal
        </p>
      </div>

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
    </RiderLayout>
  );
};

export default ProfilePage;