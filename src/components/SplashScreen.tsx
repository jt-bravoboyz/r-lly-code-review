import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

type SplashPhase = "line1" | "ready" | "line2" | "set" | "logo" | "exit";

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("line1");
  const [linePosition, setLinePosition] = useState(0);

  useEffect(() => {
    // Phase timings (total ~3 seconds)
    const timings = {
      line1Duration: 400,     // First line animation
      readyAt: 400,           // Show READY
      line2At: 900,           // Second line animation starts
      setAt: 1300,            // Show SET
      logoAt: 1800,           // Show logo
      exitAt: 2700,           // Start exit transition
      completeAt: duration,   // Complete
    };

    // Animate line position for line1
    const lineInterval = setInterval(() => {
      setLinePosition(prev => {
        if (prev >= 100) {
          clearInterval(lineInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 20);

    const readyTimer = setTimeout(() => {
      setPhase("ready");
      setLinePosition(0);
    }, timings.readyAt);

    const line2Timer = setTimeout(() => {
      setPhase("line2");
      // Animate line again
      let pos = 0;
      const line2Interval = setInterval(() => {
        pos += 5;
        setLinePosition(pos);
        if (pos >= 100) {
          clearInterval(line2Interval);
        }
      }, 20);
    }, timings.line2At);

    const setTimer = setTimeout(() => {
      setPhase("set");
      setLinePosition(0);
    }, timings.setAt);

    const logoTimer = setTimeout(() => {
      setPhase("logo");
    }, timings.logoAt);

    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, timings.exitAt);

    const completeTimer = setTimeout(onComplete, timings.completeAt);

    return () => {
      clearInterval(lineInterval);
      clearTimeout(readyTimer);
      clearTimeout(line2Timer);
      clearTimeout(setTimer);
      clearTimeout(logoTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out ${
        phase === "exit" ? "opacity-0 scale-110" : "opacity-100 scale-100"
      }`}
      style={{ backgroundColor: "#121212" }}
    >
      {/* Animated horizontal line */}
      {(phase === "line1" || phase === "line2") && (
        <div 
          className="absolute top-1/2 left-0 h-0.5 transition-none"
          style={{
            width: `${linePosition}%`,
            background: "linear-gradient(90deg, transparent 0%, #FF6A00 50%, #FF6A00 100%)",
            boxShadow: "0 0 20px rgba(255, 106, 0, 0.6), 0 0 40px rgba(255, 106, 0, 0.3)",
          }}
        />
      )}

      {/* READY text */}
      {phase === "ready" && (
        <h1 
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest animate-splash-text-pop"
          style={{ color: "rgba(255, 255, 255, 0.95)" }}
        >
          READY
        </h1>
      )}

      {/* SET text */}
      {phase === "set" && (
        <h1 
          className="font-montserrat font-extrabold text-5xl sm:text-6xl tracking-widest animate-splash-text-pop"
          style={{ color: "rgba(255, 255, 255, 0.95)" }}
        >
          SET
        </h1>
      )}

      {/* Logo reveal */}
      {(phase === "logo" || phase === "exit") && (
        <div className="relative flex flex-col items-center">
          {/* Orange pulse behind logo */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
          >
            <div 
              className="w-40 h-40 rounded-full animate-splash-pulse-once"
              style={{
                background: "radial-gradient(circle, rgba(255, 106, 0, 0.4) 0%, rgba(255, 106, 0, 0.1) 50%, transparent 70%)",
              }}
            />
          </div>
          
          {/* R@LLY wordmark */}
          <h1
            className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight animate-splash-logo-scale relative z-10"
            style={{ 
              color: "rgba(255, 255, 255, 0.95)",
              textShadow: "0 0 60px rgba(255, 106, 0, 0.4)",
            }}
          >
            R@LLY
          </h1>
          
          {/* Tagline */}
          <p
            className="mt-4 text-lg font-medium tracking-wide animate-splash-tagline-fade"
            style={{ color: "rgba(255, 255, 255, 0.70)" }}
          >
            Rally your people.
          </p>
        </div>
      )}

      {/* Subtle ambient particles */}
      {(phase === "logo" || phase === "exit") && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full animate-splash-particle"
            style={{ backgroundColor: "rgba(255, 106, 0, 0.5)" }}
          />
          <div 
            className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full animate-splash-particle-delayed"
            style={{ backgroundColor: "rgba(255, 106, 0, 0.4)" }}
          />
          <div 
            className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full animate-splash-particle-delayed-2"
            style={{ backgroundColor: "rgba(255, 106, 0, 0.45)" }}
          />
        </div>
      )}
    </div>
  );
}
