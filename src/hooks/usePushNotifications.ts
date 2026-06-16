import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
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

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      await PushNotifications.createChannel({
        id: "default_channel",
        name: "Order Notifications",
        description: "New order alerts for Cheers Lounge admin",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== "granted") {
        console.warn("❌ Push notification permission denied");
        return;
      }

      await PushNotifications.register();
    };

    setup().catch(console.error);

    // Token received → save to Supabase
    const regListener = PushNotifications.addListener(
      "registration",
      (token) => {
        console.log("✅ FCM Token:", token.value);
        saveFcmToken(token.value);
      }
    );

    // Registration failed
    const regErrListener = PushNotifications.addListener(
      "registrationError",
      (err) => console.error("❌ FCM registration error:", err.error)
    );

    // Foreground notification — app is open
    // Android suppresses the system tray popup when app is open,
    // so we re-post it as a local scheduled notification
    // so the admin still gets the heads-up banner + sound
    const foregroundListener = PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("📬 Foreground push received:", notification.title);

        await PushNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: notification.title ?? "🛒 New Order!",
              body: notification.body ?? "A new order just came in!",
              channelId: "default_channel",
              sound: "default",
              actionTypeId: "",
              extra: notification.data ?? {},
            },
          ],
        });
      }
    );

    // Admin taps notification in system tray → navigate to admin orders
    // Uses replace() so the back button doesn't get stuck
    const tapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Notification tapped:", action.notification.title);
        window.location.replace("/admin");
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