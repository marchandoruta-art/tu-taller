import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initDB } from "./lib/offlineStorage";
import workshopBg from "./assets/workshop-bg.jpg";


// Initialize IndexedDB for offline support
initDB().catch(console.error);

// Expose workshop backdrop image to CSS (used by body::before)
document.documentElement.style.setProperty(
  "--workshop-bg-image",
  `url(${workshopBg})`
);

function LocalizedApp() {
  const { i18n } = useTranslation();
  // Remount on language change so cached labels are re-read in the new language
  return <App key={i18n.resolvedLanguage} />;
}

createRoot(document.getElementById("root")!).render(<LocalizedApp />);
