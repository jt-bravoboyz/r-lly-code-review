import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Branded "welcome back" transition for returning authenticated users on
 * native (iOS / Android). Compressed cinematic R@lly wordmark entrance —
 * matches the first-run SplashScreen energy without re-introducing it.
 *
 * Web build: renders nothing (early-return) so PWA/web flow is untouched.
 * Once-per-session: gated by sessionStorage so navigating between tabs
 * doesn't re-trigger the overlay.
 */
const MAX_DURATION_MS = 1200;
const FADE_MS = 280;
const SESSION_KEY = 'rally-welcome-back-shown';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const ph = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export function WelcomeBackOverlay() {
  const isNative = Capacitor.isNativePlatform();
  const alreadyShown =
    typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1';

  const [visible, setVisible] = useState(isNative && !alreadyShown);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(performance.now());
  const frameRef = useRef<number>();

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SESSION_KEY, '1');

    const tick = () => {
      setElapsed((performance.now() - startRef.current) / 1000);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    const hideTimer = setTimeout(() => setVisible(false), MAX_DURATION_MS);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  // Reduced motion — single static fade.
  if (reducedMotion) {
    const fading = elapsed > (MAX_DURATION_MS - FADE_MS) / 1000;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center safe-top safe-bottom"
        style={{
          backgroundColor: '#0A0A0A',
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-out`,
          pointerEvents: fading ? 'none' : 'auto',
        }}
        aria-hidden="true"
      >
        <h1
          className="font-montserrat font-extrabold text-6xl tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          R<span style={{ color: '#F47A19' }}>@</span>lly
        </h1>
      </div>
    );
  }

  // Phase timings (seconds)
  const ambientOpacity = easeOutCubic(ph(elapsed, 0, 0.5)) * 0.14;

  const sweepProgress = ph(elapsed, 0.05, 0.55);
  const sweepX = easeOutQuart(sweepProgress) * 120 - 10;
  const sweepOpacity = Math.sin(sweepProgress * Math.PI) * 0.2;

  const eyebrowOpacity = easeOutCubic(ph(elapsed, 0.15, 0.4));

  const rllyOpacity = easeOutCubic(ph(elapsed, 0.35, 0.6));

  const atProgress = easeOutCubic(ph(elapsed, 0.4, 0.75));
  const atX = 80 * (1 - atProgress);
  const atY = -50 * (1 - atProgress);
  const atOpacity = easeOutCubic(ph(elapsed, 0.4, 0.55));
  const atScale = 0.7 + 0.3 * atProgress;
  const atGlow = ph(elapsed, 0.7, 0.95);
  const atGlowIntensity =
    elapsed >= 0.4
      ? atGlow > 0
        ? 0.6 + Math.sin(atGlow * Math.PI) * 0.3
        : easeOutCubic(ph(elapsed, 0.4, 0.75)) * 0.6
      : 0;

  // Exit drift / fade (0.95s — 1.2s)
  const exitProgress = ph(elapsed, 0.95, 1.15);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -8 * easeInCubic(exitProgress);
  const finalAmbient =
    exitProgress > 0 ? ambientOpacity * (1 - exitProgress) : ambientOpacity;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden safe-top safe-bottom"
      style={{ backgroundColor: '#0A0A0A' }}
      aria-hidden="true"
    >
      {/* Ambient orange radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244, 122, 25, ${finalAmbient}) 0%, transparent 70%)`,
        }}
      />

      {/* Light sweep */}
      {sweepOpacity > 0.01 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '48%',
            left: `${sweepX}%`,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweepOpacity}), transparent)`,
            filter: 'blur(50px)',
            transform: 'scaleX(4)',
          }}
        />
      )}

      {/* Typography */}
      <div
        className="relative flex flex-col items-center justify-center gap-3"
        style={{
          opacity: exitOpacity,
          transform: exitProgress > 0 ? `translateY(${exitDrift}px)` : undefined,
        }}
      >
        <span
          className="font-montserrat text-xs uppercase"
          style={{
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.22em',
            opacity: eyebrowOpacity,
            minHeight: '1em',
          }}
        >
          Welcome back
        </span>

        <h1
          className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight"
          style={{ minHeight: '1.2em' }}
        >
          <span
            style={{ color: 'rgba(255, 255, 255, 0.95)', opacity: rllyOpacity }}
          >
            R
          </span>
          <span
            style={{
              display: 'inline-block',
              color: '#F47A19',
              opacity: atOpacity,
              transform:
                atProgress < 1
                  ? `translate(${atX}px, ${atY}px) scale(${atScale})`
                  : 'none',
              textShadow:
                atGlowIntensity > 0
                  ? `0 0 ${12 + atGlowIntensity * 30}px rgba(244, 122, 25, ${atGlowIntensity * 0.65}), 0 0 ${25 + atGlowIntensity * 45}px rgba(244, 122, 25, ${atGlowIntensity * 0.3})`
                  : 'none',
            }}
          >
            @
          </span>
          <span
            style={{ color: 'rgba(255, 255, 255, 0.95)', opacity: rllyOpacity }}
          >
            lly.
          </span>
        </h1>
      </div>
    </div>
  );
}
