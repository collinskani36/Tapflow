import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

// Save or update this device's FCM token in Supabase
// Uses upsert so reinstalling the app doesn't create duplicates
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
      // ── Create notification channel ──────────────────────────────
      // importance: 5 = IMPORTANCE_HIGH
      // This is what makes the notification pop on screen WITH sound
      // even when the phone is in use — called a "heads-up notification"
      await PushNotifications.createChannel({
        id: "default_channel",
        name: "Order Notifications",
        description: "New order alerts for Cheers Lounge admin",
        importance: 5,        // 5 = HIGH → heads-up popup + sound
        visibility: 1,        // 1 = PUBLIC → visible on lock screen
        sound: "default",
        vibration: true,
        lights: true,
      });

      // ── Request permission ───────────────────────────────────────
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== "granted") {
        console.warn("❌ Push notification permission denied");
        return;
      }

      // ── Register with FCM ────────────────────────────────────────
      await PushNotifications.register();
    };

    setup().catch(console.error);

    // ── Token received → save to Supabase ───────────────────────────
    // Every admin device that opens the app gets registered here
    // The Edge Function will send to ALL tokens in this table
    const regListener = PushNotifications.addListener(
      "registration",
      (token) => {
        console.log("✅ FCM Token:", token.value);
        saveFcmToken(token.value);
      }
    );

    // ── Registration failed ──────────────────────────────────────────
    const regErrListener = PushNotifications.addListener(
      "registrationError",
      (err) => console.error("❌ FCM registration error:", err.error)
    );

    // ── Foreground notification ──────────────────────────────────────
    // When app is open, Android suppresses the system tray popup.
    // We catch it here and re-post it as a local notification
    // so the admin still gets the sound + heads-up banner.
    const foregroundListener = PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("📬 Foreground push received:", notification.title);

        // Deliver it as a local notification so it shows
        // as a heads-up banner with sound even while app is open
        await PushNotifications.schedule({
          notifications: [
            {
              id: Date.now(),                           // unique id
              title: notification.title ?? "New Order",
              body: notification.body ?? "A new order just came in!",
              channelId: "default_channel",             // must match above
              sound: "default",
              actionTypeId: "",
              extra: notification.data ?? {},
            },
          ],
        });
      }
    );

    // ── Admin taps notification → go to /admin ───────────────────────
    const tapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Notification tapped");
        window.location.href = "/admin";
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