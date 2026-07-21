// src/hooks/useRiderNotifications.ts
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  requestNotificationPermission, 
  notifyNewOrderAssigned,
  notifyOrderUpdated 
} from '@/lib/notifications';

export const useRiderNotifications = () => {
  const { riderProfile, isRider } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<{
    orderId: string;
    timestamp: number;
  } | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Request permission when rider logs in
  useEffect(() => {
    if (isRider && riderProfile) {
      const checkAndRequestPermission = async () => {
        // Check if already granted
        if (Notification.permission === 'granted') {
          setPermissionGranted(true);
          return;
        }

        // Request permission
        const granted = await requestNotificationPermission();
        setPermissionGranted(granted);
      };

      checkAndRequestPermission();
    }
  }, [isRider, riderProfile]);

  // Set up real-time subscription for rider's orders
  useEffect(() => {
    if (!isRider || !riderProfile || !permissionGranted) {
      return;
    }

    console.log('🔄 Setting up rider notification subscription...');

    // Subscribe to order changes for this rider
    const subscription = supabase
      .channel('rider-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderProfile.id}`,
        },
        (payload) => {
          console.log('📨 New order assigned to rider:', payload);
          
          // Get the new order data
          const order = payload.new as any;
          
          // Prevent duplicate notifications for the same order (within 5 seconds)
          const now = Date.now();
          if (lastNotification?.orderId === order.id && 
              now - lastNotification.timestamp < 5000) {
            console.log('⏭️ Skipping duplicate notification');
            return;
          }
          
          // Send notification
          const location = order.location_description || order.delivery_address || 'Unknown location';
          notifyNewOrderAssigned(order.id, order.phone_number, location);
          
          // Update last notification
          setLastNotification({ orderId: order.id, timestamp: now });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderProfile.id}`,
        },
        (payload) => {
          console.log('🔄 Order status updated:', payload);
          
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Only notify if status changed
          if (order.status !== oldOrder.status) {
            // Prevent duplicate notifications
            const now = Date.now();
            if (lastNotification?.orderId === order.id && 
                now - lastNotification.timestamp < 5000) {
              console.log('⏭️ Skipping duplicate notification');
              return;
            }
            
            // Only notify for certain status changes
            if (['out_for_delivery', 'delivered', 'completed'].includes(order.status)) {
              notifyOrderUpdated(order.id, order.status);
              setLastNotification({ orderId: order.id, timestamp: now });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Notification subscription status:', status);
      });

    subscriptionRef.current = subscription;

    return () => {
      console.log('🧹 Cleaning up notification subscription...');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [isRider, riderProfile, permissionGranted, lastNotification]);

  return {
    permissionGranted,
    requestPermission: requestNotificationPermission,
  };
};