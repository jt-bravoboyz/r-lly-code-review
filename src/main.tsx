import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Capture founding25 param at the earliest possible point, before any navigation
(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref === 'founding25') {
    localStorage.setItem('rally-founding25', 'true');
  }
  // Also capture referral params early
  const r = params.get('r') || params.get('referrer') || params.get('invite');
  if (r) {
    localStorage.setItem('rally-referrer-id', r);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
