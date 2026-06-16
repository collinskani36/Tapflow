import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export function usePushNotifications() {
  useEffect(() => {
    // Only run on a real Android/iOS device
    // In browser (Vercel preview) this does nothing safely
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      // ── STEP 1: Check / request permission ──────────────────
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === "prompt") {
        // Not yet asked — ask the user now
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        // User denied — exit silently, don't crash
        console.warn("Push notification permission denied");
        return;
      }

      // ── STEP 2: Register device with Firebase FCM ────────────
      await PushNotifications.register();
    };

    setup();

    // ── STEP 3: Device registered successfully → we get FCM token
    const regListener = PushNotifications.addListener(
      "registration",
      (token) => {
        // This is your device's unique FCM token
        // Right now we log it — in Step 5b we'll save it to Supabase
        console.log("✅ FCM Token:", token.value);

        // TODO (Step 5b): save this token to your Supabase `fcm_tokens` table
        // saveFcmToken(token.value);
      }
    );

    // ── STEP 4: Registration failed
    const regErrListener = PushNotifications.addListener(
      "registrationError",
      (err) => {
        console.error("FCM registration error:", err.error);
      }
    );

    // ── STEP 5: App is OPEN and a notification arrives (foreground)
    // Firebase won't show a system tray notification while app is open
    // So we handle it ourselves — show a toast or badge
    const foregroundListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("📬 Foreground notification:", notification);

        // Your Supabase realtime already handles the orders update
        // This is just in case you want a toast on top of that
        // You can call your toast here:
        // toast({ title: notification.title, description: notification.body });
      }
    );

    // ── STEP 6: User TAPS a notification in the system tray
    const tapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Notification tapped:", action.notification);

        // Navigate admin to the orders tab when they tap a new order notification
        // We use window.location because we're outside React Router here
        const data = action.notification.data;

        if (data?.type === "new_order") {
          window.location.href = "/admin";
        }
      }
    );

    // ── CLEANUP: Remove all listeners when component unmounts ──
    return () => {
      regListener.then((l) => l.remove());
      regErrListener.then((l) => l.remove());
      foregroundListener.then((l) => l.remove());
      tapListener.then((l) => l.remove());
    };
  }, []);
}