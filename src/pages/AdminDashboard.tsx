import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, LogOut, ClipboardList, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminLocations from '@/components/admin/AdminLocations';
import AdminRiders from '@/components/admin/AdminRiders';
import { fetchOrders, supabase } from '@/lib/supabase';
import { Order } from '@/types';

type Tab = 'orders' | 'products' | 'locations' | 'riders';

const AdminDashboard = () => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [unread, setUnread] = useState(0);

  // ---------------------------
  // LOAD ORDERS
  // ---------------------------
  const loadOrders = useCallback(async () => {
    const data = await fetchOrders();
    setOrders(data);
    setUnread(data.filter((o) => !o.is_read).length);
  }, []);

  // ---------------------------
  // INITIAL LOAD
  // ---------------------------
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    loadOrders();
  }, [isAdmin, navigate, loadOrders]);

  // ---------------------------
  // REAL-TIME ORDERS (SUPABASE)
  // ---------------------------
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // ---------------------------
  // TABS
  // ---------------------------
  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      key: 'orders',
      label: 'Orders',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: unread,
    },
    { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { key: 'locations', label: 'Locations', icon: <MapPin className="w-4 h-4" /> },
    { key: 'riders', label: 'Riders', icon: <UserCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="glass-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-display text-lg text-foreground">
            Admin Dashboard
          </h1>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="container pt-4 pb-2">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all relative ${
                tab === t.key
                  ? 'gold-gradient text-primary-foreground font-medium'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t.icon}
              {t.label}

              {t.badge && t.badge > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <main className="container py-4">
        {tab === 'orders' && (
          <AdminOrders orders={orders} onRefresh={loadOrders} />
        )}

        {tab === 'products' && <AdminProducts />}

        {tab === 'locations' && <AdminLocations />}

        {tab === 'riders' && <AdminRiders />}
      </main>
    </div>
  );
};

export default AdminDashboard;