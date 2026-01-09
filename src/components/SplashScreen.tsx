import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 7000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'ready' | 'set' | 'rally' | 'exit'>('ready');

  useEffect(() => {
    // Phase 1: READY - First dramatic flag swoop (0-2000ms)
    const setTimer = setTimeout(() => setPhase('set'), 2000);
    
    // Phase 2: SET - Second dramatic flag swoop (2000-4000ms)
    const rallyTimer = setTimeout(() => setPhase('rally'), 4000);
    
    // Phase 3: RALLY - Logo enters boldly (4000ms - duration-800ms)
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 800);
    
    // Phase 4: Slow exit transition
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(setTimer);
      clearTimeout(rallyTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-700 ease-out ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        
        {/* READY Phase - First Flag Swoop */}
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
            phase === 'ready' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          {/* Large dramatic flag */}
          <div className="relative">
            {/* Flag pole */}
            <div className="absolute left-0 top-0 w-3 bg-white/90 rounded-full shadow-xl" style={{ height: '320px' }} />
            
            {/* Giant white flag with dramatic swoop */}
            <div className="ml-3 animate-flag-swoop-ready">
              <svg 
                width="280" 
                height="180" 
                viewBox="0 0 280 180" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-2xl"
              >
                <defs>
                  <linearGradient id="flagGradientReady" x1="0%" y1="0%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="40%" stopColor="white" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="flagShadowReady" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="4" dy="8" stdDeviation="8" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                <path 
                  d="M0 8C0 3.58 3.58 0 8 0H260C270 0 280 10 280 20V160C280 170 270 180 260 180H8C3.58 180 0 176.42 0 172V8Z" 
                  fill="url(#flagGradientReady)"
                  filter="url(#flagShadowReady)"
                />
                
                {/* Subtle fabric texture lines */}
                <path d="M0 45 Q70 40, 140 48 T280 42" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
                <path d="M0 90 Q70 85, 140 93 T280 87" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
                <path d="M0 135 Q70 130, 140 138 T280 132" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            
            {/* Wind particles */}
            <div className="absolute -top-6 right-0 w-4 h-4 bg-white/50 rounded-full animate-wind-slow" />
            <div className="absolute top-12 -right-8 w-3 h-3 bg-white/40 rounded-full animate-wind-slow-delayed" />
            <div className="absolute top-28 -right-4 w-3 h-3 bg-white/35 rounded-full animate-wind-slow-delayed-2" />
          </div>
          
          {/* READY Text */}
          <h2 
            className="mt-12 text-5xl font-bold text-white tracking-widest animate-text-fade-in"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            READY
          </h2>
        </div>

        {/* SET Phase - Second Flag Swoop */}
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
            phase === 'set' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          {/* Large dramatic flag */}
          <div className="relative">
            {/* Flag pole */}
            <div className="absolute left-0 top-0 w-3 bg-white/90 rounded-full shadow-xl" style={{ height: '320px' }} />
            
            {/* Giant white flag with dramatic swoop */}
            <div className="ml-3 animate-flag-swoop-set">
              <svg 
                width="280" 
                height="180" 
                viewBox="0 0 280 180" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-2xl"
              >
                <defs>
                  <linearGradient id="flagGradientSet" x1="0%" y1="0%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="40%" stopColor="white" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="flagShadowSet" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="4" dy="8" stdDeviation="8" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                <path 
                  d="M0 8C0 3.58 3.58 0 8 0H260C270 0 280 10 280 20V160C280 170 270 180 260 180H8C3.58 180 0 176.42 0 172V8Z" 
                  fill="url(#flagGradientSet)"
                  filter="url(#flagShadowSet)"
                />
                
                {/* Subtle fabric texture lines */}
                <path d="M0 45 Q70 40, 140 48 T280 42" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
                <path d="M0 90 Q70 85, 140 93 T280 87" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
                <path d="M0 135 Q70 130, 140 138 T280 132" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            
            {/* Wind particles */}
            <div className="absolute -top-6 right-0 w-4 h-4 bg-white/50 rounded-full animate-wind-slow" />
            <div className="absolute top-12 -right-8 w-3 h-3 bg-white/40 rounded-full animate-wind-slow-delayed" />
            <div className="absolute top-28 -right-4 w-3 h-3 bg-white/35 rounded-full animate-wind-slow-delayed-2" />
          </div>
          
          {/* SET Text */}
          <h2 
            className="mt-12 text-5xl font-bold text-white tracking-widest animate-text-fade-in"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            SET
          </h2>
        </div>

        {/* RALLY Phase - Logo Bold Entrance */}
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
            phase === 'rally' || phase === 'exit' 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-50 pointer-events-none'
          }`}
        >
          {/* White logo - bold entrance */}
          <div className={`${phase === 'rally' || phase === 'exit' ? 'animate-logo-entrance' : ''}`}>
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-36 h-36 object-contain filter brightness-0 invert drop-shadow-2xl"
            />
          </div>
          
          {/* R@LLY Text - bold entrance */}
          <h1 
            className={`mt-6 text-6xl font-bold text-white tracking-tight ${
              phase === 'rally' || phase === 'exit' ? 'animate-text-entrance' : 'opacity-0'
            }`}
            style={{ textShadow: '0 6px 30px rgba(0,0,0,0.4)' }}
          >
            R@LLY
          </h1>

          {/* RALLY! Tagline */}
          <p 
            className={`mt-4 text-2xl text-white/95 font-semibold tracking-widest ${
              phase === 'rally' ? 'animate-tagline-entrance' : 'opacity-0'
            }`}
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            RALLY!
          </p>
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>
    </div>
  );
}