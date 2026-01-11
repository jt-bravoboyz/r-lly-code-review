import { useEffect, useState } from "react";
import wavingFlag from "@/assets/waving-flag.webp";

interface FlagSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function FlagSplash({ onComplete, duration = 1800 }: FlagSplashProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Enter phase: 0-400ms
    const holdTimer = setTimeout(() => setPhase('hold'), 400);
    // Exit phase: starts at duration - 400ms
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 400);
    // Complete
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  const getOpacity = () => {
    switch (phase) {
      case 'enter': return 0;
      case 'hold': return 1;
      case 'exit': return 0;
    }
  };

  const getScale = () => {
    switch (phase) {
      case 'enter': return 0.9;
      case 'hold': return 1;
      case 'exit': return 1.05;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ 
        backgroundColor: "#121212",
        transition: "opacity 400ms ease-out",
        opacity: phase === 'exit' ? 0 : 1,
      }}
    >
      {/* Radial gradient glow behind flag */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255, 106, 0, 0.15) 0%, rgba(255, 106, 0, 0.05) 40%, transparent 70%)",
          opacity: getOpacity(),
          transition: "opacity 400ms ease-out",
        }}
      />

      {/* Flag container */}
      <div
        className="relative flex flex-col items-center gap-6"
        style={{
          opacity: getOpacity(),
          transform: `scale(${getScale()})`,
          transition: "opacity 400ms ease-out, transform 400ms ease-out",
        }}
      >
        {/* Waving flag image */}
        <div className="relative">
          {/* Glow behind flag */}
          <div 
            className="absolute inset-0 blur-2xl opacity-40"
            style={{
              background: "radial-gradient(circle, #FF6A00 0%, transparent 70%)",
              transform: "scale(1.5)",
            }}
          />
          
          <img 
            src={wavingFlag} 
            alt="R@lly Flag" 
            className="relative w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-2xl"
            style={{
              filter: "drop-shadow(0 0 30px rgba(255, 106, 0, 0.5))",
            }}
          />
        </div>

        {/* Logo text */}
        <h1 
          className="text-4xl sm:text-5xl font-extrabold font-montserrat tracking-tight"
          style={{ 
            background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 50%, #FFB366 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 0 40px rgba(255, 106, 0, 0.4)",
          }}
        >
          R@LLY
        </h1>
      </div>
    </div>
  );
}