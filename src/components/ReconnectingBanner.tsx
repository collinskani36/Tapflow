import { Wifi } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isReconnecting: boolean;
}

export function ReconnectingBanner({ isReconnecting }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isReconnecting) {
      // Show the banner immediately when reconnecting starts
      setVisible(true);
    } else {
      // When reconnecting ends, wait 400ms before hiding
      // This lets the "Connected!" state be seen briefly
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isReconnecting]);

  // Nothing to render if not visible
  if (!visible) return null;

  return (
    <>
      {/* The banner slides down from the top of the screen */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,           // sits above everything — even modals
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 20px",
          backgroundColor: isReconnecting ? "#1a1a1a" : "#14532d",
          borderBottom: `1px solid ${isReconnecting ? "#2a2a2a" : "#166534"}`,
          transition: "background-color 0.4s ease, border-color 0.4s ease",
          // Slide in from top
          animation: "slideDown 0.3s ease forwards",
        }}
      >
        {/* Icon — spinning while reconnecting, static when done */}
        <Wifi
          size={16}
          color={isReconnecting ? "#888" : "#4ade80"}
          style={{
            animation: isReconnecting ? "spin 1s linear infinite" : "none",
            transition: "color 0.3s ease",
          }}
        />

        {/* Message */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isReconnecting ? "#aaa" : "#4ade80",
            transition: "color 0.3s ease",
            letterSpacing: 0.2,
          }}
        >
          {isReconnecting ? "Reconnecting..." : "Connected! Refreshing app..."}
        </span>

        {/* Animated dots — only show while reconnecting */}
        {isReconnecting && (
          <span
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "#555",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  display: "inline-block",
                }}
              />
            ))}
          </span>
        )}
      </div>

      {/* All keyframe animations live here */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}