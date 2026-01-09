import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'wave' | 'exit'>('enter');

  useEffect(() => {
    // Phase 1: Enter animation (0-400ms)
    const enterTimer = setTimeout(() => setPhase('wave'), 400);
    
    // Phase 2: Wave animation (400ms - duration-400ms)
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 400);
    
    // Phase 3: Exit and complete
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-400 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Decorative pill shapes - matching Figma */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top decorative pills */}
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 left-4 transform -rotate-3" />
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-52 left-20 transform rotate-2" />
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-28 left-36 transform -rotate-1" />
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 left-52 transform rotate-3" />
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-60 left-68 transform -rotate-2" />
        <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 right-4 transform rotate-1" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with cream circle background - matching Figma */}
        <div 
          className={`relative transition-all duration-600 ease-out ${
            phase === 'enter' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Cream circle behind logo */}
          <div className="w-24 h-24 rounded-full bg-rally-cream flex items-center justify-center shadow-xl">
            {/* Logo with wave animation */}
            <div className={`relative ${phase === 'wave' ? 'animate-flag-wave' : ''}`}>
              <img 
                src={rallyLogo} 
                alt="R@lly" 
                className="w-14 h-14 object-contain"
              />
            </div>
          </div>
        </div>

        {/* R@LLY Text */}
        <h1 
          className={`mt-4 text-3xl font-bold text-white tracking-tight transition-all duration-500 delay-100 ${
            phase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          R@LLY
        </h1>

        {/* Tagline */}
        <p 
          className={`mt-4 text-base text-white/90 font-montserrat tracking-wide transition-all duration-500 delay-200 ${
            phase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          } ${phase === 'exit' ? 'opacity-0 -translate-y-4' : ''}`}
        >
          READY. SET. RALLY
        </p>
      </div>
    </div>
  );
}
