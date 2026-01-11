import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { FlagSplash } from '@/components/FlagSplash';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';

type AppPhase = 'loading' | 'splash' | 'flag-splash' | 'onboarding' | 'auth';

export function AppEntry() {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  
  // Check localStorage on mount to determine if first time user
  useEffect(() => {
    const onboardingComplete = localStorage.getItem('rally-onboarding-complete');
    const firstTime = onboardingComplete !== 'true';
    setIsFirstTime(firstTime);
    
    if (firstTime) {
      // First time users get full splash + onboarding
      setPhase('splash');
    } else {
      // Returning users get a quick flag splash
      setPhase('flag-splash');
    }
  }, []);

  const handleSplashComplete = () => {
    if (isFirstTime) {
      setPhase('onboarding');
    } else {
      setPhase('auth');
    }
  };

  const handleFlagSplashComplete = () => {
    setPhase('auth');
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

  if (phase === 'flag-splash') {
    return <FlagSplash onComplete={handleFlagSplashComplete} duration={1800} />;
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Auth />;
}