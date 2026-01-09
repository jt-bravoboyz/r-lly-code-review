import { useEffect, useMemo, useState } from "react";
import rallyLogo from "@/assets/rally-logo.png";
import flagRef from "@/assets/waving-flag-white-ref.webp";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 8000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"ready" | "set" | "rally" | "exit">("ready");

  const timings = useMemo(() => {
    // Tuned for a slower, more dramatic 5–8s feel.
    const exitMs = 1000;
    const readyMs = 2800;
    const setMs = 3000;
    const rallyMs = Math.max(1200, duration - (readyMs + setMs + exitMs));

    return {
      readyMs,
      setAt: readyMs,
      rallyAt: readyMs + setMs,
      exitAt: readyMs + setMs + rallyMs,
      completeAt: readyMs + setMs + rallyMs + exitMs,
    };
  }, [duration]);

  useEffect(() => {
    const setTimer = window.setTimeout(() => setPhase("set"), timings.setAt);
    const rallyTimer = window.setTimeout(() => setPhase("rally"), timings.rallyAt);
    const exitTimer = window.setTimeout(() => setPhase("exit"), timings.exitAt);
    const completeTimer = window.setTimeout(onComplete, timings.completeAt);

    return () => {
      window.clearTimeout(setTimer);
      window.clearTimeout(rallyTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete, timings]);

  const WhiteFlag = ({ animationClass }: { animationClass: string }) => {
    const maskStyles: React.CSSProperties = {
      WebkitMaskImage: `url(${flagRef})`,
      maskImage: `url(${flagRef})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    };

    return (
      <div className={`relative ${animationClass}`} style={{ transformOrigin: "left center" }}>
        {/* Pole */}
        <div
          className="absolute left-0 top-3 bottom-3 w-2 rounded-full bg-primary-foreground/90 shadow-xl"
          aria-hidden="true"
        />
        <div
          className="absolute left-0.5 top-2 h-3 w-3 rounded-full bg-primary-foreground shadow"
          aria-hidden="true"
        />

        {/* Flag: solid white fill using animated mask + subtle fold shading overlay */}
        <div className="relative ml-2 w-80 sm:w-[380px] aspect-[16/10]">
          <div
            className="absolute inset-0 bg-primary-foreground"
            style={maskStyles}
            aria-hidden="true"
          />
          <img
            src={flagRef}
            alt="Waving white flag"
            loading="eager"
            className="absolute inset-0 h-full w-full object-contain opacity-25 mix-blend-multiply"
            style={{ filter: "grayscale(1) contrast(1.6) brightness(0.7)" }}
          />
        </div>

        {/* Wind particles */}
        <div className="absolute -top-3 right-10 h-2.5 w-2.5 rounded-full bg-primary-foreground/40 animate-wind-slow" />
        <div className="absolute top-14 -right-4 h-2 w-2 rounded-full bg-primary-foreground/30 animate-wind-slow-delayed" />
        <div className="absolute top-28 right-2 h-2.5 w-2.5 rounded-full bg-primary-foreground/25 animate-wind-slow-delayed-2" />
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-primary transition-opacity duration-1000 ease-out ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center">
        {phase === "ready" && (
          <div className="flex flex-col items-center animate-phase-enter">
            <WhiteFlag animationClass="animate-flag-swoop-ready" />
            <h2
              className="mt-8 text-5xl font-bold tracking-widest text-primary-foreground animate-text-pop"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.4)" }}
            >
              READY
            </h2>
          </div>
        )}

        {phase === "set" && (
          <div className="flex flex-col items-center animate-phase-enter">
            <WhiteFlag animationClass="animate-flag-swoop-set" />
            <h2
              className="mt-8 text-5xl font-bold tracking-widest text-primary-foreground animate-text-pop"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.4)" }}
            >
              SET
            </h2>
          </div>
        )}

        {(phase === "rally" || phase === "exit") && (
          <div className="flex flex-col items-center">
            <div className="animate-logo-entrance">
              <img
                src={rallyLogo}
                alt="R@lly"
                loading="eager"
                className="h-40 w-40 object-contain filter brightness-0 invert drop-shadow-2xl"
              />
            </div>

            <h1
              className="mt-6 text-6xl font-bold tracking-tight text-primary-foreground animate-text-entrance"
              style={{ textShadow: "0 6px 30px rgba(0,0,0,0.4)" }}
            >
              R@LLY
            </h1>

            {phase === "rally" && (
              <p
                className="mt-4 text-2xl font-semibold tracking-widest text-primary-foreground/95 animate-tagline-entrance"
                style={{ textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
              >
                RALLY!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground/5 blur-3xl animate-pulse-slow" />
      </div>
    </div>
  );
}
