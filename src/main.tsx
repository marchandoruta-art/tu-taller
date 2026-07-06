import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDB } from "./lib/offlineStorage";
import workshopBg from "./assets/workshop-bg.jpg";

// Initialize IndexedDB for offline support
initDB().catch(console.error);

// Expose workshop backdrop image to CSS
document.documentElement.style.setProperty(
  "--workshop-bg-image",
  `url(${workshopBg})`
);

// Mount a fixed backdrop layer behind the whole app
const backdrop = document.createElement("div");
backdrop.className = "workshop-backdrop";
document.body.prepend(backdrop);

createRoot(document.getElementById("root")!).render(<App />);
