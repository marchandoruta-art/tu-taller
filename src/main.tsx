import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDB } from "./lib/offlineStorage";
import workshopBg from "./assets/workshop-bg.jpg";

// Initialize IndexedDB for offline support
initDB().catch(console.error);

// Expose workshop backdrop image to CSS (used by body::before)
document.documentElement.style.setProperty(
  "--workshop-bg-image",
  `url(${workshopBg})`
);

createRoot(document.getElementById("root")!).render(<App />);
