import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const ph = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export function SplashScreen({ onComplete, duration = 5500 }: SplashScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(performance.now());
  const frameRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setElapsed((performance.now() - startRef.current) / 1000);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  // ─── PHASE 1: "@" Activation (0.0–1.2s) ───
  const atFadeIn = easeOutCubic(ph(elapsed, 0.0, 0.4));

  // Pulsing glow: very slow sine wave, gradually ramping intensity
  const pulseSpeed = 2.0; // radians/sec (~3.1s period) — much slower
  const pulseRamp = clamp(elapsed / 5.0); // ramps 0→1 very gradually
  const pulseBase = 0.15 + pulseRamp * 0.85; // starts dimmer, builds slowly
  const pulseWave = Math.sin(elapsed * pulseSpeed) * 0.5 + 0.5; // 0→1 sine
  const glowIntensity = atFadeIn * (pulseBase * 0.7 + pulseWave * pulseBase * 0.3);

  // Ambient glow synced to pulse
  const ambientOpacity = glowIntensity * 0.18;

  // ─── PHASE 2: "Ready." (1.2–2.2s) ───
  const readyOpacity = easeOutCubic(ph(elapsed, 1.2, 1.5));

  // ─── PHASE 3: "Set." (2.2–3.2s) ───
  const setOpacity = easeOutCubic(ph(elapsed, 2.2, 2.5));

  // ─── PHASE 4: R@lly Formation (3.2–4.6s) ───
  const rProgress = easeOutCubic(ph(elapsed, 3.2, 3.5));
  const llyProgress = easeOutCubic(ph(elapsed, 3.3, 3.6));
  const rX = -3 * (1 - rProgress);
  const llyX = 3 * (1 - llyProgress);

  // Light sweep across R@lly word
  const sweepProgress = ph(elapsed, 3.5, 4.2);
  const sweepX = sweepProgress * 130 - 15;
  const sweepOpacity = Math.sin(clamp(sweepProgress) * Math.PI) * 0.25;

  // ─── PHASE 6: Exit (5.2–5.5s) ───
  const exitProgress = ph(elapsed, 5.2, 5.5);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -10 * easeInCubic(exitProgress);

  // "@" glow text-shadow
  const glowRadius1 = 12 + glowIntensity * 35;
  const glowRadius2 = 25 + glowIntensity * 50;
  const glowAlpha1 = glowIntensity * 0.7;
  const glowAlpha2 = glowIntensity * 0.35;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* Ambient glow synced to @ pulse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgba(244, 122, 25, ${ambientOpacity}) 0%, transparent 70%)`,
        }}
      />

      {/* Light sweep during R@lly formation */}
      {sweepOpacity > 0.01 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "52%",
            left: `${sweepX}%`,
            width: "80px",
            height: "2px",
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweepOpacity}), transparent)`,
            filter: "blur(40px)",
            transform: "scaleX(5)",
          }}
        />
      )}

      {/* Typography container */}
      <div
        className="relative flex flex-col items-center justify-center gap-3"
        style={{
          opacity: exitOpacity,
          transform: exitProgress > 0 ? `translateY(${exitDrift}px)` : undefined,
        }}
      >
        {/* "Ready." */}
        <h1
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.16em]"
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            opacity: readyOpacity,
            minHeight: "1.2em",
          }}
        >
          Ready.
        </h1>

        {/* "Set." */}
        <h1
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.16em]"
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            opacity: setOpacity,
            minHeight: "1.2em",
          }}
        >
          Set.
        </h1>

        {/* "R@lly." — "@" is the core, R and lly resolve around it */}
        <h1
          className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight"
          style={{ minHeight: "1.2em", lineHeight: 1 }}
        >
          <span
            style={{
              display: "inline-block",
              color: "rgba(255, 255, 255, 0.95)",
              opacity: rProgress,
              transform: rProgress < 1 ? `translateX(${rX}px)` : "none",
            }}
          >
            R
          </span>
          <span
            style={{
              display: "inline-block",
              color: "#F47A19",
              opacity: atFadeIn,
              textShadow: glowIntensity > 0
                ? `0 0 ${glowRadius1}px rgba(244, 122, 25, ${glowAlpha1}), 0 0 ${glowRadius2}px rgba(244, 122, 25, ${glowAlpha2})`
                : "none",
            }}
          >
            @
          </span>
          <span
            style={{
              display: "inline-block",
              color: "rgba(255, 255, 255, 0.95)",
              opacity: llyProgress,
              transform: llyProgress < 1 ? `translateX(${llyX}px)` : "none",
            }}
          >
            lly.
          </span>
        </h1>
      </div>
    </div>
  );
}
