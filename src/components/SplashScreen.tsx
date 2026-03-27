import { useEffect, useState, useRef, useCallback } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// Easing functions
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Clamp helper
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// Phase-progress helper: returns 0–1 for elapsed within [start, end]
const phase = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(performance.now());
  const frameRef = useRef<number>();

  // Single rAF loop
  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      setElapsed((now - startRef.current) / 1000);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Fire onComplete
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  // ─── Phase 1: Activation (0 – 0.45s) ───
  const ambientIn = easeOutCubic(phase(elapsed, 0, 0.45)) * 0.15;

  // Light sweep 1: horizontal, left→right
  const sweep1Progress = phase(elapsed, 0.1, 0.5);
  const sweep1X = easeOutQuart(sweep1Progress) * 120 - 10; // -10% → 110%
  const sweep1Opacity = sweep1Progress < 0.5
    ? easeOutCubic(sweep1Progress * 2) * 0.35
    : (1 - easeInCubic((sweep1Progress - 0.5) * 2)) * 0.35;

  // ─── Phase 2: Tension Build (0.45 – 1.1s) ───
  const glowPulse = phase(elapsed, 0.45, 1.1);
  const glowOscillation = 0.15 + Math.sin(glowPulse * Math.PI) * 0.12;
  const ambientOpacity = elapsed < 0.45 ? ambientIn : glowOscillation;

  // Diagonal sweep 2
  const sweep2Progress = phase(elapsed, 0.55, 0.95);
  const sweep2X = easeOutQuart(sweep2Progress) * 130 - 15;
  const sweep2Opacity = sweep2Progress < 0.5
    ? easeOutCubic(sweep2Progress * 2) * 0.2
    : (1 - easeInCubic((sweep2Progress - 0.5) * 2)) * 0.2;

  // Glass refraction layer
  const glassProgress = phase(elapsed, 0.5, 1.0);
  const glassY = -8 + easeOutCubic(glassProgress) * 8;
  const glassOpacity = Math.sin(glassProgress * Math.PI) * 0.06;

  // ─── Phase 3: Typography Reveal (1.1 – 1.9s) ───

  // "Ready." 1.1 – 1.38
  const readyIn = phase(elapsed, 1.1, 1.22);
  const readyHold = phase(elapsed, 1.22, 1.32);
  const readyOut = phase(elapsed, 1.32, 1.38);
  const readyOpacity = readyOut > 0
    ? 1 - easeInCubic(readyOut)
    : easeOutCubic(readyIn);
  const readyY = readyOut > 0
    ? -4 * easeInCubic(readyOut)
    : 12 * (1 - easeOutCubic(readyIn));
  const readyScale = readyOut > 0
    ? 1 + 0.02 * easeInCubic(readyOut)
    : 0.97 + 0.03 * easeOutCubic(readyIn);

  // "Set." 1.35 – 1.6
  const setIn = phase(elapsed, 1.35, 1.46);
  const setOut = phase(elapsed, 1.54, 1.6);
  const setOpacity = setOut > 0
    ? 1 - easeInCubic(setOut)
    : easeOutCubic(setIn);
  const setY = setOut > 0
    ? -4 * easeInCubic(setOut)
    : 10 * (1 - easeOutCubic(setIn));
  const setScale = setOut > 0
    ? 1 + 0.02 * easeInCubic(setOut)
    : 0.97 + 0.03 * easeOutCubic(setIn);

  // "R@lly." 1.58 – 1.9
  const rallyIn = phase(elapsed, 1.58, 1.72);
  const rallySettle = phase(elapsed, 1.72, 1.82);
  const rallyOpacity = easeOutCubic(rallyIn);
  const rallyBaseScale = 0.95 + 0.07 * easeOutCubic(rallyIn); // overshoots to 1.02
  const rallySettleScale = rallySettle > 0
    ? rallyBaseScale - 0.02 * easeOutCubic(rallySettle) // settles to 1.0
    : rallyBaseScale;
  const rallyY = 14 * (1 - easeOutCubic(rallyIn));

  // Shimmer over "R@lly."
  const shimmerProgress = phase(elapsed, 1.72, 1.92);
  const shimmerX = easeOutQuart(shimmerProgress) * 120 - 10;
  const shimmerOpacity = Math.sin(shimmerProgress * Math.PI) * 0.4;

  // "@" glow intensity
  const atGlow = elapsed >= 1.58
    ? easeOutCubic(phase(elapsed, 1.58, 1.75))
    : 0;

  // ─── Phase 4: Logo Lock (1.9 – 2.35s) ───
  const logoLockProgress = phase(elapsed, 1.9, 2.15);
  const logoScale = 1 + 0.04 * easeOutCubic(logoLockProgress);
  const logoGlowIntensity = Math.sin(phase(elapsed, 1.9, 2.25) * Math.PI) * 0.5;

  // Tagline
  const taglineOpacity = easeOutCubic(phase(elapsed, 2.05, 2.3));
  const taglineY = 8 * (1 - easeOutCubic(phase(elapsed, 2.05, 2.3)));

  // ─── Phase 5: Exit (2.35 – 3.0s) ───
  const exitProgress = phase(elapsed, 2.45, 2.95);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -12 * easeInCubic(exitProgress);

  // Combined logo opacity (phase 3 R@lly + phase 4/5)
  const finalRallyOpacity = exitProgress > 0
    ? rallyOpacity * exitOpacity
    : rallyOpacity;
  const finalRallyScale = exitProgress > 0
    ? (rallySettleScale > 1 ? rallySettleScale : 1) * logoScale
    : rallySettleScale;

  // Background ambient settles during exit
  const finalAmbient = exitProgress > 0
    ? ambientOpacity * (0.6 + 0.4 * (1 - easeInCubic(exitProgress)))
    : ambientOpacity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* Ambient orange glow — center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244, 122, 25, ${finalAmbient}) 0%, transparent 70%)`,
        }}
      />

      {/* Light sweep 1 — horizontal */}
      {sweep1Opacity > 0.01 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "48%",
            left: `${sweep1X}%`,
            width: "80px",
            height: "2px",
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweep1Opacity}), transparent)`,
            filter: "blur(40px)",
            transform: "scaleX(3)",
          }}
        />
      )}

      {/* Light sweep 2 — diagonal */}
      {sweep2Opacity > 0.01 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "35%",
            left: `${sweep2X}%`,
            width: "120px",
            height: "1px",
            background: `linear-gradient(135deg, transparent, rgba(244, 122, 25, ${sweep2Opacity}), transparent)`,
            filter: "blur(30px)",
            transform: "rotate(-25deg) scaleX(4)",
          }}
        />
      )}

      {/* Glass refraction layer */}
      {glassOpacity > 0.005 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 30%, rgba(255,255,255,${glassOpacity}) 50%, transparent 70%)`,
            transform: `translateY(${glassY}px)`,
          }}
        />
      )}

      {/* ─── TYPOGRAPHY ─── */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          transform: exitProgress > 0 ? `translateY(${exitDrift}px)` : undefined,
        }}
      >
        {/* "Ready." */}
        {readyOpacity > 0.01 && elapsed < 1.6 && (
          <h1
            className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.18em]"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: readyOpacity,
              transform: `translateY(${readyY}px) scale(${readyScale})`,
              willChange: "transform, opacity",
            }}
          >
            Ready.
          </h1>
        )}

        {/* "Set." */}
        {setOpacity > 0.01 && elapsed < 1.82 && (
          <h1
            className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.18em]"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: setOpacity,
              transform: `translateY(${setY}px) scale(${setScale})`,
              willChange: "transform, opacity",
            }}
          >
            Set.
          </h1>
        )}

        {/* "R@lly." */}
        {rallyOpacity > 0.01 && (
          <div className="relative">
            {/* Orange bloom behind */}
            {logoGlowIntensity > 0.01 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(244, 122, 25, ${logoGlowIntensity * 0.3}) 0%, transparent 60%)`,
                  transform: "scale(2.5)",
                  filter: "blur(20px)",
                }}
              />
            )}

            <h1
              className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight relative z-10"
              style={{
                color: "rgba(255, 255, 255, 0.95)",
                opacity: finalRallyOpacity,
                transform: `scale(${finalRallyScale})`,
                willChange: "transform, opacity",
              }}
            >
              R
              <span
                style={{
                  color: "#F47A19",
                  textShadow: atGlow > 0
                    ? `0 0 ${20 + atGlow * 30}px rgba(244, 122, 25, ${atGlow * 0.6}), 0 0 ${40 + atGlow * 40}px rgba(244, 122, 25, ${atGlow * 0.3})`
                    : "none",
                }}
              >
                @
              </span>
              lly.
            </h1>

            {/* Shimmer pass */}
            {shimmerOpacity > 0.01 && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden z-20"
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `${shimmerX}%`,
                    width: "30px",
                    height: "100%",
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,${shimmerOpacity}), transparent)`,
                    filter: "blur(8px)",
                    transform: "skewX(-15deg)",
                  }}
                />
              </div>
            )}

            {/* Tagline */}
            {taglineOpacity > 0.01 && (
              <p
                className="text-center mt-5 text-lg font-medium tracking-wide"
                style={{
                  color: `rgba(255, 255, 255, ${0.6 * taglineOpacity * exitOpacity})`,
                  transform: `translateY(${taglineY + (exitProgress > 0 ? exitDrift * 0.3 : 0)}px)`,
                  willChange: "transform, opacity",
                }}
              >
                R@lly your troops.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
