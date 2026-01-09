import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'flag' | 'logo' | 'exit'>('flag');

  useEffect(() => {
    // Phase 1: Flag waving (0-1200ms)
    const logoTimer = setTimeout(() => setPhase('logo'), 1200);
    
    // Phase 2: Logo appears boldly (1200ms - duration-400ms)
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 400);
    
    // Phase 3: Exit and complete
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(logoTimer);
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
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* White Flag - waving patriotically */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            phase === 'flag' ? 'scale-100 opacity-100' : 'scale-75 opacity-0 -translate-y-8'
          }`}
        >
          {/* Flag pole */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-1 h-16 bg-white/80 rounded-full" />
          
          {/* White flag waving */}
          <div className="animate-flag-wave">
            <svg 
              width="120" 
              height="80" 
              viewBox="0 0 120 80" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              {/* Flag shape with wave effect */}
              <path 
                d="M0 8C0 3.58172 3.58172 0 8 0H100C106.627 0 112 5.37258 112 12V68C112 74.6274 106.627 80 100 80H8C3.58172 80 0 76.4183 0 72V8Z" 
                fill="white"
              />
              {/* R@lly flag icon inside */}
              <path 
                d="M56 20L72 40L56 60V45H40V35H56V20Z" 
                fill="#F26C15"
              />
            </svg>
          </div>
          
          {/* Sparkles around flag */}
          <div className="absolute -top-2 -right-4 w-2 h-2 bg-white rounded-full animate-sparkle opacity-80" />
          <div className="absolute top-6 -right-6 w-1.5 h-1.5 bg-white/70 rounded-full animate-sparkle-delayed" />
          <div className="absolute -top-4 left-4 w-1.5 h-1.5 bg-white/60 rounded-full animate-sparkle-delayed-2" />
        </div>

        {/* R@LLY Logo - appears boldly */}
        <div 
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            phase === 'logo' || phase === 'exit' 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-50 translate-y-12'
          }`}
        >
          {/* White logo */}
          <img 
            src={rallyLogo} 
            alt="R@lly" 
            className="w-24 h-24 object-contain filter brightness-0 invert drop-shadow-2xl"
          />
          
          {/* R@LLY Text - bold entrance */}
          <h1 
            className={`mt-4 text-4xl font-bold text-white tracking-tight transition-all duration-500 delay-200 ${
              phase === 'logo' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            R@LLY
          </h1>

          {/* Tagline */}
          <p 
            className={`mt-3 text-lg text-white/90 font-medium tracking-wide transition-all duration-500 delay-300 ${
              phase === 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            READY. SET. RALLY.
          </p>
        </div>
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
