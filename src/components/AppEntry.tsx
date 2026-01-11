import { useState } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { Onboarding } from '@/components/Onboarding';
import Auth from '@/pages/Auth';

type AppPhase = 'splash' | 'onboarding' | 'auth';

// New-user entry flow only:
// Splash -> Onboarding -> Signup/Auth
export function AppEntry() {
  const [phase, setPhase] = useState<AppPhase>('splash');

  const handleSplashComplete = () => {
    setPhase('onboarding');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('rally-onboarding-complete', 'true');
    setPhase('auth');
  };

  if (phase === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} duration={5250} />;
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Auth />;
}
