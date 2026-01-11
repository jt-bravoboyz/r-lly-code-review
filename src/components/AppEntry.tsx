import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';

type AppPhase = 'loading' | 'splash' | 'onboarding' | 'auth';

export function AppEntry() {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  
  // Check localStorage on mount to determine if first time user
  useEffect(() => {
    const onboardingComplete = localStorage.getItem('rally-onboarding-complete');
    const firstTime = onboardingComplete !== 'true';
    setIsFirstTime(firstTime);
    
    // Only show splash for first time users, skip straight to auth for returning users
    if (firstTime) {
      setPhase('splash');
    } else {
      setPhase('auth');
    }
  }, []);

  const handleSplashComplete = () => {
    if (isFirstTime) {
      setPhase('onboarding');
    } else {
      setPhase('auth');
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('rally-onboarding-complete', 'true');
    setPhase('auth');
  };

  // Show nothing while determining first time status
  if (phase === 'loading') {
    return null;
  }

  if (phase === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} duration={5250} />;
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Auth />;
}