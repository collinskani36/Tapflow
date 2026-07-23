// src/lib/notifications.ts
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const sendBrowserNotification = (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    // Defined locally rather than referencing any global DOM Notification
    // type — both NotificationAction and NotificationOptions['actions']
    // turned out to be inconsistently available depending on TS/lib.dom.d.ts
    // version in this project. This matches the real Notification API
    // shape ({ action, title, icon? }) without depending on it resolving.
    actions?: { action: string; title: string; icon?: string }[];
    requireInteraction?: boolean;
    silent?: boolean;
  }
) => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      ...options,
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      notification.close();

      // If there's a URL in the data, navigate to it
      if (options?.data?.url) {
        window.focus();
        window.location.href = options.data.url;
      }
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Helper function for order assignment notifications.
// Deliberately carries ONLY the customer's phone (so the rider can call
// them) and the delivery location — no other order details (items, price,
// transaction code, etc.) are included.
export const notifyNewOrderAssigned = (
  orderId: string,
  customerPhone: string,
  location: string
) => {
  const title = '🚚 You’ve been assigned an order';
  const body = `Call: ${customerPhone}\nLocation: ${location}`;

  return sendBrowserNotification(title, {
    body,
    tag: `order-${orderId}`,
    data: {
      url: `/rider/dashboard`,
      orderId,
    },
    requireInteraction: true,
  });
};

// Helper for when an order is updated (e.g., status change)
export const notifyOrderUpdated = (
  orderId: string,
  status: string,
  message?: string
) => {
  const statusLabels: Record<string, string> = {
    out_for_delivery: 'Out for Delivery',
    processing: 'Processing',
    delivered: 'Delivered',
    completed: 'Completed',
  };

  const label = statusLabels[status] || status;
  const title = `📦 Order ${label}`;
  const body = message || `Order #${orderId.slice(0, 8)} has been updated to ${label}`;

  return sendBrowserNotification(title, {
    body,
    tag: `order-${orderId}`,
    data: {
      url: `/rider/dashboard`,
      orderId,
    },
  });
};

// Helper for when a customer rates a completed delivery. Separate from
// notifyOrderUpdated (different tag) so a status-change notification and a
// rating notification for the same order don't overwrite/dedupe each other.
export const notifyRatingReceived = (orderId: string, rating: number) => {
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, rating)));
  const title = `${stars} You got a ${rating}-star rating!`;
  const body = `A customer rated their delivery ${rating} star${rating === 1 ? '' : 's'}.`;

  return sendBrowserNotification(title, {
    body,
    tag: `order-${orderId}-rating`,
    data: {
      url: `/rider/dashboard`,
      orderId,
    },
  });
};