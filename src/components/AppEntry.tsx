import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';

type AppPhase = 'splash' | 'onboarding' | 'auth';

export function AppEntry() {
  const [phase, setPhase] = useState<AppPhase>('splash');
  
  // Check if this is the first time opening the app
  const isFirstTime = !localStorage.getItem('rally-onboarding-complete');

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

  if (phase === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} duration={5000} />;
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Auth />;
}
