import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const ph = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export function SplashScreen({ onComplete, duration = 5000 }: SplashScreenProps) {
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

  // ─── PHASE 1: Ambient (0 – 1.0s) ───
  const ambientOpacity = easeOutCubic(ph(elapsed, 0, 0.8)) * 0.14;

  const sweepProgress = ph(elapsed, 0.2, 0.9);
  const sweepX = easeOutQuart(sweepProgress) * 120 - 10;
  const sweepOpacity = Math.sin(sweepProgress * Math.PI) * 0.2;

  // ─── PHASE 2: Typography (staggered, each word stays) ───
  // "Ready." fades in 1.0–1.3, stays
  const readyOpacity = easeOutCubic(ph(elapsed, 1.0, 1.3));

  // "Set." fades in 2.0–2.3, stays
  const setOpacity = easeOutCubic(ph(elapsed, 2.0, 2.3));

  // "@" swoops in 3.0–3.5
  const atProgress = easeOutCubic(ph(elapsed, 3.0, 3.5));
  const atX = 80 * (1 - atProgress);
  const atY = -50 * (1 - atProgress);
  const atOpacity = easeOutCubic(ph(elapsed, 3.0, 3.2));
  const atScale = 0.7 + 0.3 * atProgress;
  // Glow peaks right after landing
  const atGlow = ph(elapsed, 3.4, 3.8);
  const atGlowIntensity = elapsed >= 3.0
    ? (atGlow > 0 ? 0.6 + Math.sin(atGlow * Math.PI) * 0.3 : easeOutCubic(ph(elapsed, 3.0, 3.5)) * 0.6)
    : 0;

  // "R" and "lly." fade in as "@" arrives
  const rllyOpacity = easeOutCubic(ph(elapsed, 3.3, 3.6));

  // ─── EXIT (4.4 – 5.0s) ───
  const exitProgress = ph(elapsed, 4.4, 4.9);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -8 * easeInCubic(exitProgress);

  const finalAmbient = exitProgress > 0
    ? ambientOpacity * (0.5 + 0.5 * (1 - exitProgress))
    : ambientOpacity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* Ambient glow */}
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
            top: "48%",
            left: `${sweepX}%`,
            width: "100px",
            height: "2px",
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweepOpacity}), transparent)`,
            filter: "blur(50px)",
            transform: "scaleX(4)",
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
        {/* "Ready." — fixed position, fade in only */}
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

        {/* "Set." — fixed position, fade in only */}
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

        {/* "R@lly." — "@" swoops in, rest fades */}
        <h1
          className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight"
          style={{ minHeight: "1.2em" }}
        >
          <span
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: rllyOpacity,
            }}
          >
            R
          </span>
          <span
            style={{
              display: "inline-block",
              color: "#F47A19",
              opacity: atOpacity,
              transform: atProgress < 1
                ? `translate(${atX}px, ${atY}px) scale(${atScale})`
                : "none",
              textShadow: atGlowIntensity > 0
                ? `0 0 ${12 + atGlowIntensity * 30}px rgba(244, 122, 25, ${atGlowIntensity * 0.65}), 0 0 ${25 + atGlowIntensity * 45}px rgba(244, 122, 25, ${atGlowIntensity * 0.3})`
                : "none",
            }}
          >
            @
          </span>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: rllyOpacity,
            }}
          >
            lly.
          </span>
        </h1>
      </div>
    </div>
  );
}
