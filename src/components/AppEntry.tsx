import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { FlagSplash } from '@/components/FlagSplash';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';

type AppPhase = 'loading' | 'splash' | 'flag-splash' | 'onboarding' | 'auth';

export function AppEntry() {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  
  // Check localStorage on mount to determine user state
  useEffect(() => {
    // URL param bypass for testing: ?returning=true
    const urlParams = new URLSearchParams(window.location.search);
    const returningParam = urlParams.get('returning') === 'true';
    
    const hasAccount = localStorage.getItem('rally-has-account') === 'true' || returningParam;
    
    if (hasAccount) {
      // Returning users go straight to auth (no splash)
      setIsFirstTime(false);
      setPhase('auth');
    } else {
      // No account = full onboarding flow (splash + onboarding + signup)
      setIsFirstTime(true);
      setPhase('splash');
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