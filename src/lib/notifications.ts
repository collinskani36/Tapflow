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
    actions?: NotificationAction[];
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

// Helper function for order assignment notifications
export const notifyNewOrderAssigned = (
  orderId: string,
  customerPhone: string,
  location: string
) => {
  const title = '🚚 New Delivery Assigned!';
  const body = `Customer: ${customerPhone}\nLocation: ${location}\nTap to view order details`;

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