import { WifiOff, RefreshCw } from "lucide-react";
import { Network } from "@capacitor/network";
import { useState } from "react";

export function OfflineScreen() {
  const [checking, setChecking] = useState(false);

  // When user taps "Try Again", manually check if internet is back
  const handleRetry = async () => {
    setChecking(true);

    // Wait 1.5 seconds so the spinner feels real, not instant
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const status = await Network.getStatus();

    if (status.connected) {
      // Internet is back! Reload the whole app fresh from Vercel
      window.location.reload();
    } else {
      // Still offline — just stop spinning
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",        // dvh = fills screen including phone notch area
        padding: "32px 24px",
        backgroundColor: "#0a0a0a", // matches your app's dark theme
        textAlign: "center",
        gap: "0px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <WifiOff size={36} color="#888" />
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#ffffff",
          margin: "0 0 12px 0",
        }}
      >
        You're offline
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 15,
          color: "#888",
          margin: "0 0 40px 0",
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        Check your Wi-Fi or mobile data, then tap below to try again.
      </p>

      {/* Retry button */}
      <button
        onClick={handleRetry}
        disabled={checking}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          backgroundColor: checking ? "#1a1a1a" : "#D4A017", // gold = your Tap_Flow brand color
          color: checking ? "#666" : "#000",
          border: "none",
          borderRadius: 12,
          padding: "14px 32px",
          fontSize: 15,
          fontWeight: 600,
          cursor: checking ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          minWidth: 180,
          justifyContent: "center",
        }}
      >
        <RefreshCw
          size={18}
          style={{
            animation: checking ? "spin 1s linear infinite" : "none",
          }}
        />
        {checking ? "Checking..." : "Try again"}
      </button>

      {/* Spinner animation — only needed for the RefreshCw icon above */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Bottom hint */}
      <p
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 12,
          color: "#444",
          margin: 0,
        }}
      >
        Cheers Lounge 
      </p>
    </div>
  );
}