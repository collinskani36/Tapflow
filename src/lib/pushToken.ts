// src/lib/pushToken.ts
//
// Keeps this device's FCM token in sync with Supabase:
//   - registerPushToken()   -> after login (called by usePushNotifications)
//   - unregisterPushToken() -> BEFORE signOut (needs the user's session)
//
// Tokens are only ever written through the register_push_token /
// unregister_push_token database functions, which derive the role and rider
// from the logged-in user. The app never decides who a token belongs to.

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "fcm_token";
let currentToken: string | null = null;

export async function registerPushToken(token: string): Promise<void> {
  currentToken = token;
  await Preferences.set({ key: STORAGE_KEY, value: token });

  const { error } = await supabase.rpc("register_push_token", {
    p_token: token,
    p_platform: Capacitor.getPlatform(),
  });

  if (error) {
    console.error("❌ Failed to register push token:", error.message);
  } else {
    console.log("✅ Push token registered");
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const stored = currentToken ?? (await Preferences.get({ key: STORAGE_KEY })).value;

    if (stored) {
      const { error } = await supabase.rpc("unregister_push_token", { p_token: stored });
      if (error) console.error("❌ Failed to unregister push token:", error.message);
    }

    await Preferences.remove({ key: STORAGE_KEY });
    currentToken = null;

    // Drop the FCM token itself so the next login on this phone gets a fresh one.
    await PushNotifications.unregister().catch(() => {});
  } catch (e) {
    // Never block logout because of a push cleanup problem.
    console.warn("Push cleanup skipped:", e);
  }
}
