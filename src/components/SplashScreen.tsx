import { useEffect, useState, useRef } from "react";

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
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Clamp helper
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// Phase-progress helper: returns 0–1 for elapsed within [start, end]
const ph = (elapsed: number, start: number, end: number) =>
  clamp((elapsed - start) / (end - start));

export function SplashScreen({ onComplete, duration = 4200 }: SplashScreenProps) {
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

  // ─── PHASE 1: System Wake (0 – 1.2s) ───
  const ambientIn = easeOutCubic(ph(elapsed, 0, 0.8)) * 0.12;
  const ambientPulse = ph(elapsed, 0.8, 1.2);
  const ambientOscillation = 0.12 + Math.sin(ambientPulse * Math.PI) * 0.08;
  const ambientOpacity = elapsed < 0.8 ? ambientIn : ambientOscillation;

  // Light sweep — slow horizontal
  const sweep1Progress = ph(elapsed, 0.3, 1.0);
  const sweep1X = easeOutQuart(sweep1Progress) * 120 - 10;
  const sweep1Opacity = sweep1Progress < 0.5
    ? easeOutCubic(sweep1Progress * 2) * 0.25
    : (1 - easeInCubic((sweep1Progress - 0.5) * 2)) * 0.25;

  // ─── PHASE 2: "Ready." → "Set." (1.2 – 2.2s) ───

  // "Ready." — 1.2 – 1.9 (hold ~0.5s visible)
  const readyIn = ph(elapsed, 1.2, 1.4);
  const readyOut = ph(elapsed, 1.82, 1.92);
  const readyOpacity = readyOut > 0
    ? 1 - easeInCubic(readyOut)
    : easeOutCubic(readyIn);
  const readyY = readyOut > 0
    ? -6 * easeInCubic(readyOut)
    : 14 * (1 - easeOutCubic(readyIn));

  // "Set." — 1.85 – 2.2
  const setIn = ph(elapsed, 1.85, 2.05);
  const setOut = ph(elapsed, 2.12, 2.22);
  const setOpacity = setOut > 0
    ? 1 - easeInCubic(setOut)
    : easeOutCubic(setIn);
  const setY = setOut > 0
    ? -6 * easeInCubic(setOut)
    : 12 * (1 - easeOutCubic(setIn));

  // ─── PHASE 3: Hero "@" moment (2.2 – 3.2s) ───

  // "@" swoop — enters from top-right on a curved path
  const atEnterStart = 2.25;
  const atEnterEnd = 2.65;
  const atProgress = ph(elapsed, atEnterStart, atEnterEnd);
  const atEased = easeOutBack(atProgress);

  // Curved path: starts top-right, swoops to center
  const atStartX = 120; // px offset right
  const atStartY = -80; // px offset up
  const atX = atStartX * (1 - atEased);
  const atY = atStartY * (1 - atEased);
  const atOpacity = easeOutCubic(ph(elapsed, atEnterStart, atEnterStart + 0.15));
  const atScale = 0.6 + 0.4 * atEased;

  // "@" glow pulse on "landing"
  const atLanded = ph(elapsed, atEnterEnd, atEnterEnd + 0.3);
  const atGlowIntensity = elapsed >= atEnterStart
    ? (atLanded > 0 ? 0.7 + Math.sin(atLanded * Math.PI) * 0.3 : easeOutCubic(atProgress) * 0.7)
    : 0;

  // "R" and "lly." fade in as "@" lands
  const rllyIn = ph(elapsed, atEnterEnd - 0.1, atEnterEnd + 0.2);
  const rllyOpacity = easeOutCubic(rllyIn);

  // Impact bloom behind "@"
  const bloomProgress = ph(elapsed, atEnterEnd - 0.05, atEnterEnd + 0.4);
  const bloomOpacity = Math.sin(bloomProgress * Math.PI) * 0.4;
  const bloomScale = 1 + easeOutCubic(bloomProgress) * 1.5;

  // ─── PHASE 4: Full Phrase Resolve (3.2 – 3.8s) ───
  const fullPhraseIn = ph(elapsed, 3.0, 3.25);
  const fullPhraseOpacity = easeOutCubic(fullPhraseIn);

  // Subtle shimmer across full phrase
  const shimmerProgress = ph(elapsed, 3.25, 3.6);
  const shimmerX = easeOutQuart(shimmerProgress) * 130 - 15;
  const shimmerOpacity = Math.sin(shimmerProgress * Math.PI) * 0.3;

  // Gentle glow breathing on full phrase
  const glowBreath = ph(elapsed, 3.2, 3.8);
  const breathOpacity = 0.15 + Math.sin(glowBreath * Math.PI * 2) * 0.08;

  // ─── PHASE 5: Logo Lock + Transition (3.8 – 4.2s) ───
  const exitProgress = ph(elapsed, 3.85, 4.15);
  const exitOpacity = 1 - easeInCubic(exitProgress);
  const exitDrift = -10 * easeInCubic(exitProgress);

  // Background glow settles
  const finalAmbient = exitProgress > 0
    ? (breathOpacity > 0 ? breathOpacity : ambientOpacity) * (0.5 + 0.5 * (1 - easeInCubic(exitProgress)))
    : (elapsed > 3.2 ? breathOpacity : ambientOpacity);

  // Are we in the full-phrase display phase?
  const showFullPhrase = elapsed >= 3.0 && fullPhraseOpacity > 0;
  // Are we in hero "@" phase?
  const showHeroAt = elapsed >= atEnterStart && elapsed < 3.2;
  // Show "Ready." and "Set." individually
  const showReady = readyOpacity > 0.01 && elapsed < 2.2;
  const showSet = setOpacity > 0.01 && elapsed < 2.3;

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

      {/* Light sweep — slow horizontal */}
      {sweep1Opacity > 0.01 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "48%",
            left: `${sweep1X}%`,
            width: "100px",
            height: "2px",
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,${sweep1Opacity}), transparent)`,
            filter: "blur(50px)",
            transform: "scaleX(4)",
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
        {/* Phase 2: "Ready." */}
        {showReady && (
          <h1
            className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.18em]"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: readyOpacity,
              transform: `translateY(${readyY}px)`,
              willChange: "transform, opacity",
            }}
          >
            Ready.
          </h1>
        )}

        {/* Phase 2: "Set." */}
        {showSet && (
          <h1
            className="absolute font-montserrat font-extrabold text-5xl sm:text-6xl tracking-[0.18em]"
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              opacity: setOpacity,
              transform: `translateY(${setY}px)`,
              willChange: "transform, opacity",
            }}
          >
            Set.
          </h1>
        )}

        {/* Phase 3: Hero "@" swoop-in with R_lly forming around it */}
        {showHeroAt && (
          <div className="relative">
            {/* Impact bloom behind "@" */}
            {bloomOpacity > 0.01 && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{
                  transform: `scale(${bloomScale})`,
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(244, 122, 25, ${bloomOpacity}) 0%, transparent 70%)`,
                    filter: "blur(15px)",
                  }}
                />
              </div>
            )}

            <h1
              className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight relative z-10"
              style={{
                willChange: "transform, opacity",
              }}
            >
              {/* "R" */}
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.95)",
                  opacity: rllyOpacity * (exitProgress > 0 ? exitOpacity : 1),
                }}
              >
                R
              </span>

              {/* "@" — hero element with swoop */}
              <span
                style={{
                  display: "inline-block",
                  color: "#F47A19",
                  opacity: atOpacity * (exitProgress > 0 ? exitOpacity : 1),
                  transform: `translate(${atX}px, ${atY}px) scale(${atScale})`,
                  textShadow: atGlowIntensity > 0
                    ? `0 0 ${15 + atGlowIntensity * 35}px rgba(244, 122, 25, ${atGlowIntensity * 0.7}), 0 0 ${30 + atGlowIntensity * 50}px rgba(244, 122, 25, ${atGlowIntensity * 0.35})`
                    : "none",
                  willChange: "transform, opacity",
                  transition: "none",
                }}
              >
                @
              </span>

              {/* "lly." */}
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.95)",
                  opacity: rllyOpacity * (exitProgress > 0 ? exitOpacity : 1),
                }}
              >
                lly.
              </span>
            </h1>
          </div>
        )}

        {/* Phase 4: Full phrase "Ready. Set. R@lly." */}
        {showFullPhrase && !showHeroAt && (
          <div className="relative">
            {/* Subtle glow behind */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle, rgba(244, 122, 25, ${breathOpacity * 0.6}) 0%, transparent 60%)`,
                transform: "scale(3)",
                filter: "blur(25px)",
              }}
            />

            <h1
              className="font-montserrat font-extrabold text-4xl sm:text-5xl tracking-[0.12em] relative z-10 whitespace-nowrap"
              style={{
                color: "rgba(255, 255, 255, 0.95)",
                opacity: fullPhraseOpacity * exitOpacity,
                transform: exitProgress > 0 ? undefined : undefined,
                willChange: "opacity",
              }}
            >
              Ready. Set.{" "}
              <span className="relative inline-block">
                R
                <span
                  style={{
                    color: "#F47A19",
                    textShadow: `0 0 20px rgba(244, 122, 25, 0.5), 0 0 40px rgba(244, 122, 25, 0.25)`,
                  }}
                >
                  @
                </span>
                lly.
              </span>
            </h1>

            {/* Shimmer pass */}
            {shimmerOpacity > 0.01 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `${shimmerX}%`,
                    width: "40px",
                    height: "100%",
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,${shimmerOpacity}), transparent)`,
                    filter: "blur(10px)",
                    transform: "skewX(-15deg)",
                  }}
                />
              </div>
            )}

            {/* Tagline */}
            {elapsed > 3.3 && (
              <p
                className="text-center mt-5 text-lg font-medium tracking-wide"
                style={{
                  color: `rgba(255, 255, 255, ${0.5 * easeOutCubic(ph(elapsed, 3.3, 3.6)) * exitOpacity})`,
                  transform: `translateY(${8 * (1 - easeOutCubic(ph(elapsed, 3.3, 3.6)))}px)`,
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
