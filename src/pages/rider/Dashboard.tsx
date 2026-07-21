// src/pages/rider/Dashboard.tsx (premium layout + shop-origin navigation)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bike,
  Navigation,
  Phone,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Package,
  Bell,
  BellOff,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { distanceFromLounge, LOUNGE_COORDS } from '@/lib/geo';
import RiderLayout from '@/components/rider/RiderLayout';
import { useRiderNotifications } from '@/hooks/useRiderNotifications';

interface OrderWithDelivery {
  id: string;
  phone_number: string;
  location_description: string;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  status: string;
  created_at: string;
  distance_km: number | null;
  location_name: string | null;
  is_received: boolean;
  rating: number | null;
}

interface RiderStats {
  today: number;
  lifetime: number;
  avgRating: number | null;
}

const Dashboard = () => {
  const { riderProfile } = useAuth();
  const { permissionGranted, requestPermission } = useRiderNotifications();
  const [activeOrders, setActiveOrders] = useState<OrderWithDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [stats, setStats] = useState<RiderStats>({ today: 0, lifetime: 0, avgRating: null });
  const [statsLoading, setStatsLoading] = useState(true);

  // Load active orders
  const loadActiveOrders = async () => {
    if (!riderProfile) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        phone_number,
        location_description,
        delivery_address,
        delivery_lat,
        delivery_lng,
        status,
        created_at,
        distance_km,
        is_received,
        rating,
        delivery_locations ( name )
      `)
      .eq('rider_id', riderProfile.id)
      .in('status', ['out_for_delivery', 'processing'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      const ordersWithDistance = data.map((order: any) => {
        let distance = order.distance_km;
        if (!distance && order.delivery_lat && order.delivery_lng) {
          distance = distanceFromLounge(
            order.delivery_lat,
            order.delivery_lng
          );
        }
        return {
          ...order,
          distance_km: distance,
          location_name: order.delivery_locations?.name || null,
        };
      });
      setActiveOrders(ordersWithDistance);
    }
    setLoading(false);
  };

  // Load rider performance stats (today's deliveries, lifetime, avg rating)
  const loadStats = async () => {
    if (!riderProfile) return;

    setStatsLoading(true);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayRes, lifetimeRes, ratingsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('rider_id', riderProfile.id)
        .in('status', ['delivered', 'completed'])
        .gte('created_at', startOfToday.toISOString()),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('rider_id', riderProfile.id)
        .in('status', ['delivered', 'completed']),
      supabase
        .from('orders')
        .select('rating')
        .eq('rider_id', riderProfile.id)
        .in('status', ['delivered', 'completed'])
        .not('rating', 'is', null),
    ]);

    const ratings = (ratingsRes.data || [])
      .map((r: any) => r.rating)
      .filter((r: number | null): r is number => r !== null);
    const avgRating = ratings.length
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

    setStats({
      today: todayRes.count || 0,
      lifetime: lifetimeRes.count || 0,
      avgRating,
    });
    setStatsLoading(false);
  };

  // Mark order as delivered
  const markAsDelivered = async (orderId: string) => {
    if (!riderProfile) return;

    setProcessingOrder(orderId);
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        is_received: true,
      })
      .eq('id', orderId)
      .eq('rider_id', riderProfile.id);

    if (!error) {
      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      // Keep today's/lifetime counts in sync without a full refetch
      setStats((prev) => ({ ...prev, today: prev.today + 1, lifetime: prev.lifetime + 1 }));
    }
    setProcessingOrder(null);
  };

  // Open navigation in external maps, starting from the shop instead of the rider's live GPS
  const openNavigation = (lat: number | null, lng: number | null, address: string | null) => {
    const origin = `${LOUNGE_COORDS.lat},${LOUNGE_COORDS.lng}`;

    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}&travelmode=driving`;
      window.open(url, '_blank');
    } else if (address) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(address)}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  // Call customer
  const callCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle notification permission request
  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowNotificationPrompt(false);
    }
  };

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = riderProfile?.name?.split(' ')[0] || 'Rider';

  useEffect(() => {
    loadActiveOrders();
    loadStats();

    // Check if notifications are supported but not granted
    if ('Notification' in window && Notification.permission === 'default') {
      // Wait a moment before showing the prompt
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Real-time subscription for rider's orders
    if (riderProfile) {
      const subscription = supabase
        .channel('rider-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `rider_id=eq.${riderProfile.id}`,
          },
          (payload) => {
            loadActiveOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [riderProfile]);

  // Format time
  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      out_for_delivery: {
        label: 'Out for Delivery',
        className: 'bg-orange-500/10 text-orange-400 border-orange-400/30',
      },
      processing: {
        label: 'Processing',
        className: 'bg-purple-500/10 text-purple-400 border-purple-400/30',
      },
    };

    const { label, className } = config[status as keyof typeof config] || config.out_for_delivery;

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <RiderLayout>
      <div className="space-y-5 pb-20">
        {/* Greeting Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center shrink-0 shadow-lg">
              <Bike className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-tight">{getGreeting()},</p>
              <h1 className="font-display text-lg text-foreground tracking-tight truncate leading-tight">
                {firstName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-500 uppercase tracking-wider">Online</span>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="glass-card rounded-xl p-3 border border-border/50 text-center">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <Package className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="font-display text-lg text-foreground leading-none">
              {statsLoading ? '—' : stats.today}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Today</p>
          </div>
          <div className="glass-card rounded-xl p-3 border border-border/50 text-center">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="font-display text-lg text-foreground leading-none">
              {statsLoading ? '—' : stats.lifetime}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Lifetime</p>
          </div>
          <div className="glass-card rounded-xl p-3 border border-border/50 text-center">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <Star className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="font-display text-lg text-foreground leading-none">
              {statsLoading ? '—' : stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Rating</p>
          </div>
        </div>

        {/* Notification Status */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border/30">
          <div className="flex items-center gap-2">
            {permissionGranted ? (
              <Bell className="w-4 h-4 text-green-500" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {permissionGranted 
                ? 'Notifications enabled' 
                : 'Notifications disabled'}
            </span>
          </div>
          {!permissionGranted && 'Notification' in window && Notification.permission !== 'denied' && (
            <button
              onClick={handleEnableNotifications}
              className="text-xs text-primary hover:underline"
            >
              Enable
            </button>
          )}
        </div>

        {/* Notification Prompt */}
        {showNotificationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5"
          >
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Stay updated in real-time</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable notifications to get alerts when new orders are assigned to you.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleEnableNotifications}
                    className="px-4 py-1.5 rounded-lg gold-gradient text-primary-foreground text-xs font-medium hover:opacity-90 transition"
                  >
                    Enable Notifications
                  </button>
                  <button
                    onClick={() => setShowNotificationPrompt(false)}
                    className="px-4 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Deliveries Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="font-display text-base text-foreground tracking-tight">
            Active Deliveries
          </h2>
          <span className="text-xs text-muted-foreground">
            {loading ? 'Loading...' : `${activeOrders.length} order${activeOrders.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Active Orders */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-secondary rounded" />
                  <div className="h-4 w-16 bg-secondary rounded" />
                </div>
                <div className="h-3 w-32 bg-secondary rounded" />
                <div className="h-3 w-20 bg-secondary rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-secondary rounded-lg" />
                  <div className="h-8 w-16 bg-secondary rounded-lg" />
                  <div className="h-8 w-24 bg-secondary rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-12 text-center border border-border/50"
          >
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No active deliveries</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              You'll receive notifications when orders are assigned
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
            {activeOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {order.phone_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-background/50">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {order.location_description || order.delivery_address || 'Location not specified'}
                    </p>
                    {order.location_name && (
                      <p className="text-xs text-muted-foreground">{order.location_name}</p>
                    )}
                    {order.distance_km !== null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📏 {order.distance_km.toFixed(1)} km from lounge
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => callCustomer(order.phone_number)}
                    className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Call</span>
                  </button>

                  <button
                    onClick={() => openNavigation(
                      order.delivery_lat,
                      order.delivery_lng,
                      order.delivery_address || order.location_description
                    )}
                    className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
                  >
                    <Navigation className="w-4 h-4" />
                    <span className="hidden sm:inline">Navigate</span>
                  </button>

                  <button
                    onClick={() => markAsDelivered(order.id)}
                    disabled={!!processingOrder}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {processingOrder === order.id ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Delivered</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </RiderLayout>
  );
};

export default Dashboard;