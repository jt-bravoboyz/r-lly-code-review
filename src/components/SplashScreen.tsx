import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 4500 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'flag' | 'logo' | 'exit'>('flag');

  useEffect(() => {
    // Phase 1: Flag waving (0-2000ms)
    const logoTimer = setTimeout(() => setPhase('logo'), 2000);
    
    // Phase 2: Logo appears boldly (2000ms - duration-400ms)
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
        {/* White Flag - American style waving dramatically */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            phase === 'flag' ? 'scale-100 opacity-100' : 'scale-75 opacity-0 -translate-y-8'
          }`}
        >
          {/* Flag pole */}
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/90 rounded-full shadow-lg" style={{ height: 'calc(100% + 80px)' }} />
          
          {/* White American-style flag waving dramatically */}
          <div className="animate-flag-wave-dramatic ml-2">
            <svg 
              width="200" 
              height="130" 
              viewBox="0 0 200 130" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-2xl"
            >
              {/* Flag with wave ripples - American flag proportions */}
              <defs>
                <linearGradient id="flagWave" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="1" />
                  <stop offset="25%" stopColor="white" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="white" stopOpacity="1" />
                  <stop offset="75%" stopColor="white" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.98" />
                </linearGradient>
                <filter id="flagShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Main flag body with wave effect - American flag shape */}
              <path 
                d="M0 5C0 2.23858 2.23858 0 5 0H190C195.523 0 200 4.47715 200 10V120C200 125.523 195.523 130 190 130H5C2.23858 130 0 127.761 0 125V5Z" 
                fill="url(#flagWave)"
                filter="url(#flagShadow)"
                className="animate-flag-ripple"
              />
              
              {/* Subtle wave lines to give depth */}
              <path 
                d="M0 30 Q50 25, 100 32 T200 28" 
                stroke="rgba(0,0,0,0.03)" 
                strokeWidth="1" 
                fill="none"
              />
              <path 
                d="M0 60 Q50 55, 100 62 T200 58" 
                stroke="rgba(0,0,0,0.03)" 
                strokeWidth="1" 
                fill="none"
              />
              <path 
                d="M0 90 Q50 85, 100 92 T200 88" 
                stroke="rgba(0,0,0,0.03)" 
                strokeWidth="1" 
                fill="none"
              />
              <path 
                d="M0 120 Q50 115, 100 122 T200 118" 
                stroke="rgba(0,0,0,0.03)" 
                strokeWidth="1" 
                fill="none"
              />
            </svg>
          </div>
          
          {/* Wind effect particles */}
          <div className="absolute -top-4 right-0 w-3 h-3 bg-white/60 rounded-full animate-wind-particle" />
          <div className="absolute top-8 -right-6 w-2 h-2 bg-white/50 rounded-full animate-wind-particle-delayed" />
          <div className="absolute top-20 -right-4 w-2.5 h-2.5 bg-white/40 rounded-full animate-wind-particle-delayed-2" />
          <div className="absolute -top-2 right-12 w-1.5 h-1.5 bg-white/50 rounded-full animate-wind-particle" />
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
            className="w-28 h-28 object-contain filter brightness-0 invert drop-shadow-2xl"
          />
          
          {/* R@LLY Text - bold entrance */}
          <h1 
            className={`mt-4 text-5xl font-bold text-white tracking-tight transition-all duration-500 delay-200 ${
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
