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

// Navigate to admin — works whether app is open or cold-starting
function goToAdmin() {
  console.log("👆 Navigating to /admin");
  // Small delay so React has time to fully mount before navigation
  setTimeout(() => {
    window.location.replace("/admin");
  }, 300);
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

      // ── Check if the app was LAUNCHED by tapping a notification ──
      // This handles the cold-start case where the app was closed.
      // getDeliveredNotifications returns any notification that was
      // tapped to open the app — if we find a new_order one, navigate.
      try {
        const delivered = await PushNotifications.getDeliveredNotifications();
        const orderNotif = delivered.notifications.find(
          (n) => n.data?.type === "new_order"
        );
        if (orderNotif) {
          console.log("📬 App opened from notification tap — going to /admin");
          // Clear it so it doesn't trigger again on next app open
          await PushNotifications.removeDeliveredNotifications({
            notifications: [orderNotif],
          });
          goToAdmin();
        }
      } catch (e) {
        // Safe to ignore — getDeliveredNotifications may not work on all devices
        console.warn("Could not check delivered notifications:", e);
      }
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

    // Foreground notification — re-post as local so heads-up shows with sound
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

    // ── App is OPEN and admin taps the notification banner ──
    // This fires reliably when the app is already running in foreground
    // or background (not fully killed)
    const tapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Tap action performed:", action.notification.title);
        goToAdmin();
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