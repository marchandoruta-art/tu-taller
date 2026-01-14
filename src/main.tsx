import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDB } from "./lib/offlineStorage";

// Initialize IndexedDB for offline support
initDB().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
