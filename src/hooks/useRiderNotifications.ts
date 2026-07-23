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

          // Rider assignment happens via UPDATE (rider_id gets set, and
          // status flips to 'out_for_delivery' in the SAME write) — not via
          // INSERT, since orders are created unassigned. This must be
          // checked BEFORE the generic status-change branch below, or the
          // simultaneous status flip fires "Order Out for Delivery" instead
          // of the actual assignment notification.
          const wasJustAssignedToMe =
            order.rider_id != null &&
            order.rider_id === riderProfile.id &&
            oldOrder.rider_id !== order.rider_id;

          if (wasJustAssignedToMe) {
            if (!isDuplicate(`${order.id}:assigned`)) {
              const location = order.location_description || order.delivery_address || 'Unknown location';
              notifyNewOrderAssigned(order.id, order.phone_number, location);
            }
            // Don't also fire the generic status notification for this same
            // write — being assigned already tells the rider what they need
            // to know; a redundant "Out for Delivery" toast right after adds
            // noise, not information.
          } else if (
            order.status !== oldOrder.status &&
            ['out_for_delivery', 'delivered', 'completed'].includes(order.status) &&
            !isDuplicate(`${order.id}:status`)
          ) {
            notifyOrderUpdated(order.id, order.status);
          }

          // Rating change → "You got a X-star rating!" — independent of
          // status/assignment, since a customer can rate at any point after
          // receiving their order.
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