import { useState, useEffect } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'wave' | 'exit'>('enter');

  useEffect(() => {
    // Phase 1: Enter animation (0-500ms)
    const enterTimer = setTimeout(() => setPhase('wave'), 500);
    
    // Phase 2: Wave animation (500ms - duration-500ms)
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 500);
    
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] gradient-radial opacity-50" />
        
        {/* Animated rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-48 h-48 rounded-full border border-primary/20 transition-all duration-1000 ${phase !== 'enter' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-72 h-72 rounded-full border border-primary/10 transition-all duration-1000 delay-200 ${phase !== 'enter' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-96 h-96 rounded-full border border-primary/5 transition-all duration-1000 delay-300 ${phase !== 'enter' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/40 animate-float" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-primary/30 animate-float-delayed" />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-primary/35 animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-primary/25 animate-float-delayed" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with Flag Animation */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            phase === 'enter' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Glow behind logo */}
          <div className={`absolute inset-0 w-36 h-36 -m-2 rounded-full bg-primary/25 blur-2xl transition-all duration-1000 ${
            phase === 'wave' ? 'animate-pulse-glow scale-110' : 'scale-100'
          }`} />
          
          {/* Logo with wave animation */}
          <div className={`relative ${phase === 'wave' ? 'animate-flag-wave' : ''}`}>
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-32 h-32 object-contain drop-shadow-2xl"
            />
          </div>
          
          {/* Sparkle effects during wave */}
          {phase === 'wave' && (
            <>
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-primary rounded-full animate-sparkle" />
              <div className="absolute top-4 -right-4 w-2 h-2 bg-primary/70 rounded-full animate-sparkle-delayed" />
              <div className="absolute -top-4 right-4 w-2 h-2 bg-primary/50 rounded-full animate-sparkle-delayed-2" />
            </>
          )}
        </div>

        {/* Text */}
        <div 
          className={`mt-6 text-center transition-all duration-700 delay-300 ${
            phase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          } ${phase === 'exit' ? 'opacity-0 -translate-y-4' : ''}`}
        >
          <p className="text-lg font-medium text-muted-foreground">
            Rally your crew
          </p>
        </div>

        {/* Loading dots */}
        <div 
          className={`flex gap-1.5 mt-8 transition-all duration-500 delay-500 ${
            phase === 'enter' || phase === 'exit' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-loading-dot" />
          <div className="w-2 h-2 rounded-full bg-primary animate-loading-dot" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}
