import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Branded "welcome back" transition for returning authenticated users on
 * native (iOS / Android). Holds a centered, pulsing R@lly mark over the
 * dark brand background while contexts and Mapbox assets hydrate, then
 * fades out. Hard-capped at 1.2s so it never feels sluggish.
 *
 * Web build: renders nothing (early-return) so PWA/web flow is untouched.
 * Once-per-session: gated by sessionStorage so navigating between tabs
 * doesn't re-trigger the overlay.
 */
const MAX_DURATION_MS = 1200;
const FADE_MS = 280;
const SESSION_KEY = 'rally-welcome-back-shown';

export function WelcomeBackOverlay() {
  const isNative = Capacitor.isNativePlatform();
  const alreadyShown =
    typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1';

  const [visible, setVisible] = useState(isNative && !alreadyShown);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SESSION_KEY, '1');

    const fadeTimer = setTimeout(
      () => setFading(true),
      MAX_DURATION_MS - FADE_MS,
    );
    const hideTimer = setTimeout(() => setVisible(false), MAX_DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor: '#0F172A',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
      aria-hidden="true"
    >
      <div
        className="relative flex flex-col items-center gap-4"
        style={{ animation: 'rally-welcome-pulse 1.2s ease-in-out infinite' }}
      >
        <div
          className="absolute inset-0 -m-8 rounded-full blur-2xl opacity-40"
          style={{
            background:
              'radial-gradient(circle, #F47A19 0%, transparent 70%)',
          }}
        />
        <img
          src="/logo.svg"
          alt=""
          className="relative w-20 h-20 drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(244,122,25,0.55))' }}
        />
        <h1
          className="relative font-montserrat font-extrabold text-3xl tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          R<span style={{ color: '#F47A19' }}>@</span>lly
        </h1>
      </div>
      <style>{`
        @keyframes rally-welcome-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.92; }
        }
      `}</style>
    </div>
  );
}
