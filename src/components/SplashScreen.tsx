import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';
import wavingFlag from '@/assets/waving-flag.webp';

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

  // White waving flag component using real flag GIF with white filter
  const WhiteWavingFlag = ({ animationClass }: { animationClass: string }) => (
    <div className={`relative ${animationClass}`}>
      <img 
        src={wavingFlag} 
        alt="Waving flag" 
        className="w-72 h-auto drop-shadow-2xl"
        style={{ 
          filter: 'brightness(0) invert(1) drop-shadow(0 8px 20px rgba(0,0,0,0.3))',
        }}
      />
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
          <div className="flex flex-col items-center animate-phase-enter">
            <WhiteWavingFlag animationClass="animate-flag-swoop-ready" />
            
            {/* READY Text */}
            <h2 
              className="mt-8 text-5xl font-bold text-white tracking-widest animate-text-pop"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
            >
              READY
            </h2>
          </div>
        )}

        {/* SET Phase - Second Flag Swoop */}
        {phase === 'set' && (
          <div className="flex flex-col items-center animate-phase-enter">
            <WhiteWavingFlag animationClass="animate-flag-swoop-set" />
            
            {/* SET Text */}
            <h2 
              className="mt-8 text-5xl font-bold text-white tracking-widest animate-text-pop"
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
                className="w-40 h-40 object-contain filter brightness-0 invert drop-shadow-2xl"
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