// src/pages/rider/HistoryPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Star, Clock, User, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import RiderLayout from '@/components/rider/RiderLayout';

interface HistoryOrder {
  id: string;
  phone_number: string;
  location_description: string;
  delivery_address: string | null;
  status: string;
  created_at: string;
  rating: number | null;
  location_name: string | null;
}

const HistoryPage = () => {
  const { riderProfile } = useAuth();
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    if (!riderProfile) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        phone_number,
        location_description,
        delivery_address,
        status,
        created_at,
        rating,
        delivery_locations ( name )
      `)
      .eq('rider_id', riderProfile.id)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const transformed = data.map((order: any) => ({
        ...order,
        location_name: order.delivery_locations?.name || null,
      }));
      setHistory(transformed);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [riderProfile]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Star rating display
  const RatingStars = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-border fill-transparent'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <RiderLayout>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div>
          <h1 className="font-display text-xl text-foreground tracking-tight">
            Delivery History
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${history.length} completed deliveries`}
          </p>
        </div>

        {/* History List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse space-y-2">
                <div className="h-4 w-24 bg-secondary rounded" />
                <div className="h-3 w-32 bg-secondary rounded" />
                <div className="h-3 w-20 bg-secondary rounded" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-12 text-center border border-border/50"
          >
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No delivery history</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Completed deliveries will appear here
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2">
            {history.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-xl p-3 border border-border/30 hover:border-border/60 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">
                        {order.phone_number}
                      </p>
                    </div>

                    <div className="flex items-start gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground truncate">
                        {order.location_description || order.delivery_address || 'Location not specified'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(order.created_at)} at {formatTime(order.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      Delivered
                    </span>
                    <RatingStars rating={order.rating} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </RiderLayout>
  );
};

export default HistoryPage;