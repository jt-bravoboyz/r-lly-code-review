import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';
import ReturningAuth from '@/pages/ReturningAuth';

type AppPhase = 'loading' | 'splash' | 'onboarding' | 'new-user-auth' | 'returning-auth';

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
      // Returning users go straight to returning auth (no splash, no onboarding)
      setIsFirstTime(false);
      setPhase('returning-auth');
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
      setPhase('returning-auth');
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('rally-onboarding-complete', 'true');
    setPhase('new-user-auth');
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

  if (phase === 'returning-auth') {
    return <ReturningAuth />;
  }

  // new-user-auth phase
  return <Auth />;
}
