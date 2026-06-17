import { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, Truck, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomer } from '@/context/CustomerContext';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_time: number;
  products: { name: string } | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  transaction_code: string;
  rating: number | null;
  delivery_locations: { name: string } | null;
  order_items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_verification: { label: 'Pending', color: 'text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed:           { label: 'Confirmed', color: 'text-blue-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  processing:          { label: 'Processing', color: 'text-blue-400', icon: <Package className="w-3.5 h-3.5" /> },
  out_for_delivery:    { label: 'On the way', color: 'text-primary', icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:           { label: 'Delivered', color: 'text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed:           { label: 'Completed', color: 'text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:            { label: 'Rejected', color: 'text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const CustomerOrderHistory = () => {
  const { customer } = useCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, created_at, status, total_amount, transaction_code, rating,
          delivery_locations ( name ),
          order_items ( id, quantity, price_at_time, products ( name ) )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      setOrders((data as unknown as Order[]) || []);
      setLoading(false);
    };
    load();
  }, [customer]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 animate-pulse space-y-2">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-4 w-40 bg-secondary rounded" />
            <div className="h-3 w-16 bg-secondary rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <Package className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">No orders yet.</p>
        <p className="text-xs text-muted-foreground/60">Your order history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'text-muted-foreground', icon: null };
        const date = new Date(order.created_at).toLocaleDateString('en-KE', {
          day: 'numeric', month: 'short', year: 'numeric',
        });

        return (
          <div key={order.id} className="glass-card rounded-xl p-4 space-y-3">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{date}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {order.delivery_locations?.name ?? 'Unknown location'}
                </p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.products?.name ?? 'Item'} × {item.quantity}</span>
                  <span>KSh {(item.price_at_time * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between border-t border-border/30 pt-2">
              <div>
                <span className="text-xs text-muted-foreground">M-Pesa: </span>
                <span className="text-xs font-mono text-foreground">{order.transaction_code}</span>
              </div>
              <div className="flex items-center gap-2">
                {order.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                    <Star className="w-3 h-3 fill-yellow-400" /> {order.rating}
                  </span>
                )}
                <span className="text-sm font-semibold gold-text">
                  KSh {Number(order.total_amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomerOrderHistory;