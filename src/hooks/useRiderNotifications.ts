// src/hooks/useRiderNotifications.ts
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  requestNotificationPermission, 
  notifyNewOrderAssigned,
  notifyOrderUpdated,
  notifyRatingReceived,
} from '@/lib/notifications';

export const useRiderNotifications = () => {
  const { riderProfile, isRider } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  // Keyed by `${orderId}:${kind}` (e.g. "abc123:assigned", "abc123:status",
  // "abc123:rating") so a status-change notification and a rating
  // notification for the SAME order within the same few seconds don't
  // suppress each other — only true duplicates of the same kind do.
  const lastNotificationRef = useRef<Map<string, number>>(new Map());
  const subscriptionRef = useRef<any>(null);

  const isDuplicate = (key: string, windowMs = 5000): boolean => {
    const now = Date.now();
    const last = lastNotificationRef.current.get(key);
    if (last && now - last < windowMs) return true;
    lastNotificationRef.current.set(key, now);
    return false;
  };

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
          
          if (isDuplicate(`${order.id}:assigned`)) {
            console.log('⏭️ Skipping duplicate assignment notification');
            return;
          }
          
          // Send notification — phone + location only, no other order details
          const location = order.location_description || order.delivery_address || 'Unknown location';
          notifyNewOrderAssigned(order.id, order.phone_number, location);
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
          console.log('🔄 Order updated:', payload);
          
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Status change → "Order Out for Delivery / Delivered / Completed"
          if (
            order.status !== oldOrder.status &&
            ['out_for_delivery', 'delivered', 'completed'].includes(order.status) &&
            !isDuplicate(`${order.id}:status`)
          ) {
            notifyOrderUpdated(order.id, order.status);
          }

          // Rating change → "You got a X-star rating!" — independent of
          // status, since a customer can rate at any point after receiving
          // their order, separately from whatever status transition happened.
          if (
            order.rating != null &&
            order.rating !== oldOrder.rating &&
            !isDuplicate(`${order.id}:rating`)
          ) {
            notifyRatingReceived(order.id, order.rating);
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
  }, [isRider, riderProfile, permissionGranted]);

  return {
    permissionGranted,
    requestPermission: requestNotificationPermission,
  };
};