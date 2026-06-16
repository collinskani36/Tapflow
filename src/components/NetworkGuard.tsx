import { useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { OfflineScreen } from "@/components/OfflineScreen";
import { ReconnectingBanner } from "@/components/ReconnectingBanner";

interface Props {
  children: React.ReactNode; // everything inside your app
}

export function NetworkGuard({ children }: Props) {
  const { isOnline, isReconnecting } = useNetworkStatus();

  // When we come back online, reload after the banner has been seen
  useEffect(() => {
    if (isReconnecting) {
      // Wait 2.5s so user sees the "Connected! Refreshing..." message
      // then reload the app fresh from Vercel
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isReconnecting]);

  // ─── OFFLINE ────────────────────────────────────────────────
  // Phone has no internet at all → show the offline screen
  // The real app is completely hidden behind this
  if (!isOnline && !isReconnecting) {
    return <OfflineScreen />;
  }

  // ─── ONLINE (normal or reconnecting) ────────────────────────
  // Show the real app either way.
  // If reconnecting, the banner floats on top — app is still visible underneath.
  return (
    <>
      {/* Banner slides in from top when reconnecting — invisible otherwise */}
      <ReconnectingBanner isReconnecting={isReconnecting} />

      {/* Your entire app lives here — all routes, all pages */}
      {children}
    </>
  );
}