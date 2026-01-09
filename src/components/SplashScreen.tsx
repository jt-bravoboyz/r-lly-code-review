import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "tagline" | "exit">("logo");
  const [rippleActive, setRippleActive] = useState(false);

  useEffect(() => {
    // Start ripple immediately
    const rippleTimer = setTimeout(() => setRippleActive(true), 100);
    
    // Show tagline after logo fades in (600ms)
    const taglineTimer = setTimeout(() => setPhase("tagline"), 700);
    
    // Begin exit transition
    const exitTimer = setTimeout(() => setPhase("exit"), duration - 300);
    
    // Complete and unmount
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(rippleTimer);
      clearTimeout(taglineTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ease-out ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#121212" }}
    >
      {/* Radial gradient glow from center */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(255, 106, 0, 0.10) 0%, rgba(255, 106, 0, 0.04) 40%, transparent 70%)",
        }}
      />

      {/* Single pulse ripple behind logo */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          rippleActive ? "animate-splash-ripple" : "opacity-0 scale-0"
        }`}
        style={{
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(255, 106, 0, 0.25) 0%, rgba(255, 106, 0, 0.08) 50%, transparent 70%)",
        }}
      />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* R@lly Wordmark */}
        <h1
          className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight animate-splash-logo-fade"
          style={{ 
            color: "rgba(255, 255, 255, 0.90)",
            textShadow: "0 0 60px rgba(255, 106, 0, 0.3)",
          }}
        >
          R@LLY
        </h1>

        {/* Tagline */}
        <p
          className={`mt-4 text-lg sm:text-xl font-medium tracking-wide transition-all duration-500 ${
            phase === "tagline" || phase === "exit" 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-2"
          }`}
          style={{ color: "rgba(255, 255, 255, 0.70)" }}
        >
          Rally your people.
        </p>
      </div>

      {/* Subtle ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full animate-splash-particle"
          style={{ backgroundColor: "rgba(255, 106, 0, 0.4)" }}
        />
        <div 
          className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full animate-splash-particle-delayed"
          style={{ backgroundColor: "rgba(255, 106, 0, 0.3)" }}
        />
        <div 
          className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full animate-splash-particle-delayed-2"
          style={{ backgroundColor: "rgba(255, 106, 0, 0.35)" }}
        />
      </div>
    </div>
  );
}
