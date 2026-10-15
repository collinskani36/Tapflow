import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from "@capacitor/splash-screen";

const hideSplash = async () => {
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    // Not running in Capacitor (e.g. browser dev), safe to ignore
  }
};

const root = createRoot(document.getElementById("root")!);

root.render(<App />);

// Hide splash after the page fully paints
window.addEventListener("load", () => {
  // Small buffer ensures React has painted the first frame
  setTimeout(hideSplash, 300);
});