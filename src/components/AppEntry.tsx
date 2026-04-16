import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { Onboarding } from '@/components/Onboarding';
import { useAuth } from '@/hooks/useAuth';
import Auth from '@/pages/Auth';

type AppPhase = 'splash' | 'onboarding' | 'auth';

// New-user entry flow only:
// Splash -> Onboarding -> Signup/Auth
export function AppEntry() {
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<AppPhase>('splash');

  // If user is already authenticated, skip the entire entry flow
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSplashComplete = () => {
    setPhase('onboarding');
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
