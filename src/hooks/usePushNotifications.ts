// src/hooks/usePushNotifications.ts
//
// Native (Android) push for admin and riders only.
//  - Starts only once a user is logged in AND their role is admin or rider.
//  - Registers the device token through register_push_token (see pushToken.ts).
//  - Taps navigate with react-router (no page reload), restricted to the
//    routes that role is allowed to open.
//
// Must be called from a component rendered INSIDE <BrowserRouter>
// (see PushRegistrar in App.tsx).

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAuth } from "@/context/AuthContext";
import { registerPushToken } from "@/lib/pushToken";

const CHANNEL_ID = "default_channel"; // must match channel_id in the edge function

export function usePushNotifications() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // Keep the latest navigate without re-running the effect when it changes.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (loading || !user || (role !== "admin" && role !== "rider")) return;

    let cancelled = false;
    const handles: PluginListenerHandle[] = [];

    // Listener registration is async; if we're torn down before a handle
    // arrives, remove it as soon as it does.
    const keep = (p: Promise<PluginListenerHandle>) =>
      p.then((h) => {
        if (cancelled) h.remove();
        else handles.push(h);
      });

    const goTo = (route: unknown) => {
      if (typeof route !== "string") return;
      const allowed = role === "admin" ? route.startsWith("/admin") : route.startsWith("/rider/");
      if (allowed) navigateRef.current(route);
    };

    const setup = async () => {
      // Listeners first, so nothing is missed once register() runs.
      keep(
        PushNotifications.addListener("registration", (token) => {
          registerPushToken(token.value).catch(console.error);
        }),
      );

      keep(
        PushNotifications.addListener("registrationError", (err) =>
          console.error("❌ FCM registration error:", err.error),
        ),
      );

      // App in foreground: Android doesn't show a banner for push messages,
      // so re-post it as a local notification on the same channel.
      keep(
        PushNotifications.addListener("pushNotificationReceived", async (n) => {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now() % 2147483647,
                title: n.title ?? "Cheers Lounge",
                body: n.body ?? "",
                channelId: CHANNEL_ID,
                extra: n.data ?? {},
              },
            ],
          });
        }),
      );

      // Tap on a push (app in background, or cold start).
      keep(
        PushNotifications.addListener("pushNotificationActionPerformed", (action) =>
          goTo(action.notification.data?.route),
        ),
      );

      // Tap on the local notification posted while the app was open.
      keep(
        LocalNotifications.addListener("localNotificationActionPerformed", (action) =>
          goTo(action.notification.extra?.route),
        ),
      );

      await PushNotifications.createChannel({
        id: CHANNEL_ID,
        name: "Order Notifications",
        description: "Order alerts for Cheers Lounge",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });

      await LocalNotifications.requestPermissions();

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") {
        console.warn("❌ Push notification permission denied");
        return;
      }

      await PushNotifications.register();
    };

    setup().catch(console.error);

    return () => {
      cancelled = true;
      handles.forEach((h) => h.remove());
    };
  }, [user?.id, role, loading]);
}