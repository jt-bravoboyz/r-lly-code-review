import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import rallyLogo from "@/assets/rally-logo.png";

// Preload the R@lly logo immediately so the auth loading state renders it instantly.
(() => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = rallyLogo;
  (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = "high";
  document.head.appendChild(link);
  // Also kick off a decode so it's in the image cache fully decoded.
  const img = new Image();
  img.src = rallyLogo;
  img.decoding = "sync";
})();


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
