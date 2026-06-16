import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

// This describes the shape of what we track
interface NetworkState {
  isOnline: boolean;         // Are we connected right now?
  isReconnecting: boolean;   // Did we JUST come back online?
  connectionType: string;    // "wifi", "cellular", "none"
}

export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: true,        // Assume online at first
    isReconnecting: false,
    connectionType: "unknown",
  });

  useEffect(() => {
    // Step A: Check the current status RIGHT NOW when the app opens
    const checkInitialStatus = async () => {
      const status = await Network.getStatus();
      setState((prev) => ({
        ...prev,
        isOnline: status.connected,
        connectionType: status.connectionType,
      }));
    };

    checkInitialStatus();

    // Step B: Listen for changes WHILE the app is open
    const listener = Network.addListener("networkStatusChange", (status) => {
      setState((prev) => {
        const wasOffline = !prev.isOnline;      // Were we offline before?
        const nowOnline = status.connected;     // Are we online now?

        return {
          isOnline: nowOnline,
          // If we WERE offline and now we're back → show "reconnecting" briefly
          isReconnecting: wasOffline && nowOnline,
          connectionType: status.connectionType,
        };
      });

      // After 3 seconds, clear the "reconnecting" state
      if (status.connected) {
        setTimeout(() => {
          setState((prev) => ({ ...prev, isReconnecting: false }));
        }, 3000);
      }
    });

    // Step C: Clean up when the component unmounts (good practice)
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return state;
}