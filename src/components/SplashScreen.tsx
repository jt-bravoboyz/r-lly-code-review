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

  // Realistic waving flag SVG component
  const WavingFlag = ({ animationClass }: { animationClass: string }) => (
    <div className="relative">
      {/* Flag pole */}
      <div className="absolute left-0 top-0 w-2 bg-gradient-to-b from-gray-200 via-white to-gray-300 rounded-full shadow-lg" style={{ height: '280px', zIndex: 10 }} />
      <div className="absolute left-0.5 top-0 w-1 h-4 bg-yellow-200 rounded-full shadow" style={{ zIndex: 11 }} />
      
      {/* Waving flag with realistic fabric curves */}
      <div className={`ml-2 ${animationClass}`} style={{ transformOrigin: 'left center' }}>
        <svg 
          width="260" 
          height="160" 
          viewBox="0 0 260 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            {/* Gradient for fabric depth */}
            <linearGradient id="fabricGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="30%" stopColor="#F8F8F8" stopOpacity="1" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#F0F0F0" stopOpacity="1" />
            </linearGradient>
            
            {/* Shadow for depth */}
            <filter id="flagDepth" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25"/>
            </filter>
            
            {/* Inner shadow for fabric folds */}
            <linearGradient id="foldShadow1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E8E8E8" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E8E8E8" />
            </linearGradient>
          </defs>
          
          {/* Main flag shape with realistic wave curves */}
          <path 
            d="M0 8 
               C0 3 3 0 8 0 
               L60 5 
               C100 -2 140 12 180 3 
               C220 -5 250 8 258 12
               L258 148
               C250 152 220 165 180 157
               C140 148 100 162 60 155
               L8 160
               C3 160 0 157 0 152
               Z" 
            fill="url(#fabricGradient)"
            filter="url(#flagDepth)"
          />
          
          {/* Fabric fold highlights */}
          <path 
            d="M60 5 C100 -2 140 12 180 3 C220 -5 250 8 258 12
               L258 20
               C250 16 220 3 180 11
               C140 20 100 6 60 13
               L60 5Z" 
            fill="rgba(255,255,255,0.6)"
          />
          
          {/* Fabric fold shadows - creates depth */}
          <path 
            d="M0 50 Q65 42 130 55 T260 48" 
            stroke="rgba(0,0,0,0.06)" 
            strokeWidth="20" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M0 100 Q65 92 130 105 T260 98" 
            stroke="rgba(0,0,0,0.05)" 
            strokeWidth="18" 
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Highlight streaks - fabric catching light */}
          <path 
            d="M20 30 Q85 25 150 35 T240 28" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="3" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M20 80 Q85 75 150 85 T240 78" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M20 130 Q85 125 150 135 T240 128" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Wind effect particles */}
      <div className="absolute -top-4 right-8 w-3 h-3 bg-white/40 rounded-full animate-wind-slow" />
      <div className="absolute top-16 -right-4 w-2 h-2 bg-white/30 rounded-full animate-wind-slow-delayed" />
      <div className="absolute top-32 right-0 w-2.5 h-2.5 bg-white/25 rounded-full animate-wind-slow-delayed-2" />
    </div>
  );

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-700 ease-out ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full">
        
        {/* READY Phase - First Flag Swoop */}
        {phase === 'ready' && (
          <div className="flex flex-col items-center animate-fade-in">
            <WavingFlag animationClass="animate-flag-swoop-ready" />
            
            {/* READY Text */}
            <h2 
              className="mt-10 text-5xl font-bold text-white tracking-widest"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
            >
              READY
            </h2>
          </div>
        )}

        {/* SET Phase - Second Flag Swoop */}
        {phase === 'set' && (
          <div className="flex flex-col items-center animate-fade-in">
            <WavingFlag animationClass="animate-flag-swoop-set" />
            
            {/* SET Text */}
            <h2 
              className="mt-10 text-5xl font-bold text-white tracking-widest"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
            >
              SET
            </h2>
          </div>
        )}

        {/* RALLY Phase - Logo Bold Entrance */}
        {(phase === 'rally' || phase === 'exit') && (
          <div className="flex flex-col items-center">
            {/* White logo - bold entrance */}
            <div className="animate-logo-entrance">
              <img 
                src={rallyLogo} 
                alt="R@lly" 
                className="w-36 h-36 object-contain filter brightness-0 invert drop-shadow-2xl"
              />
            </div>
            
            {/* R@LLY Text - bold entrance */}
            <h1 
              className="mt-6 text-6xl font-bold text-white tracking-tight animate-text-entrance"
              style={{ textShadow: '0 6px 30px rgba(0,0,0,0.4)' }}
            >
              R@LLY
            </h1>

            {/* RALLY! Tagline */}
            {phase === 'rally' && (
              <p 
                className="mt-4 text-2xl text-white/95 font-semibold tracking-widest animate-tagline-entrance"
                style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              >
                RALLY!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>
    </div>
  );
}