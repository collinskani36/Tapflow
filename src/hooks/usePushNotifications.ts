import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

async function saveFcmToken(token: string) {
  const { error } = await supabase
    .from("fcm_tokens")
    .upsert({ token, updated_at: new Date().toISOString() }, { onConflict: "token" });

  if (error) {
    console.error("❌ Failed to save FCM token:", error.message);
  } else {
    console.log("✅ FCM token saved to Supabase");
  }
}

// Navigate to admin orders tab — works for cold start and warm start
function goToAdminOrders() {
  console.log("👆 Navigating to /admin?tab=orders");
  setTimeout(() => {
    window.location.replace("/admin?tab=orders");
  }, 300);
}

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      await PushNotifications.createChannel({
        id: "default_channel",
        name: "Order Notifications",
        description: "New order alerts for Complex Liquors admin",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });

      await LocalNotifications.requestPermissions();

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== "granted") {
        console.warn("❌ Push notification permission denied");
        return;
      }

      await PushNotifications.register();

      // Cold-start: app was launched by tapping a notification
      try {
        const delivered = await PushNotifications.getDeliveredNotifications();
        const orderNotif = delivered.notifications.find(
          (n) => n.data?.type === "new_order"
        );
        if (orderNotif) {
          console.log("📬 App opened from notification tap — going to /admin");
          await PushNotifications.removeDeliveredNotifications({
            notifications: [orderNotif],
          });
          goToAdminOrders();
        }
      } catch (e) {
        console.warn("Could not check delivered notifications:", e);
      }
    };

    setup().catch(console.error);

    const regListener = PushNotifications.addListener(
      "registration",
      (token) => {
        console.log("✅ FCM Token:", token.value);
        saveFcmToken(token.value);
      }
    );

    const regErrListener = PushNotifications.addListener(
      "registrationError",
      (err) => console.error("❌ FCM registration error:", err.error)
    );

    // Foreground: re-post as local notification
    const foregroundListener = PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("📬 Foreground push received:", notification.title);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: notification.title ?? "🛒 New Order!",
              body: notification.body ?? "A new order just came in!",
              channelId: "default_channel",
              sound: "default",
              actionTypeId: "",
              extra: notification.data ?? {},
              schedule: { at: new Date(Date.now() + 100) },
            },
          ],
        });
      }
    );

    // App open/background: admin taps the notification banner
    const tapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Tap action performed:", action.notification.title);
        goToAdminOrders();
      }
    );

    return () => {
      regListener.then((l) => l.remove());
      regErrListener.then((l) => l.remove());
      foregroundListener.then((l) => l.remove());
      tapListener.then((l) => l.remove());
    };
  }, []);
}