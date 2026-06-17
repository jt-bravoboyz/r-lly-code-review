import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface TutorialStep {
  id: string;
  title: string;
  command: string;
  instruction: string;
  targetSelector?: string;
  requiredAction: 'tap' | 'navigate' | 'scroll' | 'complete';
  targetRoute?: string;
  position?: 'top' | 'bottom' | 'center' | 'above-nav';
  ctaButton?: {
    label: string;
    route: string;
  };
  illustration?: 'safety-dashboard' | 'inside-rally' | 'split-check';
  scanTargets?: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'WELCOME TO R@LLY',
    command: 'ORIENTATION BRIEF',
    instruction: "This is how you move with your squad. Plan the night. Run the night. Get everyone home. Mission-ready in under a minute.",
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'command-center',
    title: 'YOUR COMMAND CENTER',
    command: 'NAVIGATION TRAINING',
    instruction: "Five buttons. One mission. Home. R@lly. Alerts. Tab. Squads. Everything you need to run the night lives down there.",
    requiredAction: 'complete',
    position: 'above-nav',
    scanTargets: [
      '[data-tutorial="nav-home"]',
      '[data-tutorial="nav-events"]',
      '[data-tutorial="nav-notifications"]',
      '[data-tutorial="nav-tabs"]',
      '[data-tutorial="nav-squads"]',
    ],
  },
  {
    id: 'create-rally',
    title: 'PLAN THE MISSION',
    command: 'MISSION PLANNING',
    instruction: "Tap it. Name it. Drop a Location and Time. Dress code, song recs, the vibe — all yours. Then send out the invites.",
    requiredAction: 'complete',
    position: 'above-nav',
    targetRoute: '/',
    scanTargets: [
      '[data-tutorial="create-event-button"]',
    ],
  },
  {
    id: 'inside-rally',
    title: 'RUN THE NIGHT',
    command: 'SITUATIONAL AWARENESS',
    instruction: "Once it's live, your squad shows up on the map. See who's arrived. Who's en route. Who's running late. Need a ride? Volunteer as DD, or request a pickup.",
    requiredAction: 'complete',
    position: 'center',
    illustration: 'inside-rally',
  },
  {
    id: 'open-tab',
    title: 'OPEN THE TAB',
    command: 'R@LLY TAB',
    instruction: "Every R@lly has a Tab. Tap it.",
    requiredAction: 'navigate',
    position: 'above-nav',
    targetSelector: '[data-tutorial="nav-tabs"]',
    targetRoute: '/tabs',
    scanTargets: [
      '[data-tutorial="nav-tabs"]',
    ],
  },
  {
    id: 'split-check',
    title: 'SPLIT THE CHECK',
    command: 'R@LLY TAB',
    instruction: "Snap the receipt. R@lly reads it. Your squad taps what they ordered. Done. No Math. No Drama.",
    requiredAction: 'complete',
    position: 'center',
    illustration: 'split-check',
  },
  {
    id: 'going-rogue',
    title: 'GOING ROGUE',
    command: 'THE PLOT TWIST',
    instruction: "Plans change. The night moves. Hit Going Rogue and you're off-script. Your squad knows. The night keeps going. On your terms.",
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'rally-home',
    title: 'R@LLY HOME',
    command: "THE MISSION ENDS HERE",
    instruction: "Every night ends one of two ways. Going Rogue — or R@lly Home. When the night winds down, everyone confirms they made it back safe. Nobody gets left behind. This is what makes R@lly different.",
    requiredAction: 'complete',
    position: 'center',
    illustration: 'safety-dashboard',
  },
  {
    id: 'graduation',
    title: 'TRAINING COMPLETE',
    command: "YOU'RE CLEARED",
    instruction: "You're R@lly-ready. Build your squad. Plan the night. Move out.",
    requiredAction: 'complete',
    position: 'center',
  },
];

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep | null;
  currentStepIndex: number;
  totalSteps: number;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  completeAction: (actionType: string, targetSelector?: string) => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { user, profile, loading: authLoading } = useAuth();

  const currentStep = isActive ? TUTORIAL_STEPS[currentStepIndex] : null;

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const navigate = useNavigate();

  const endTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('rally-tutorial-complete', 'true');
    localStorage.setItem('rally-walkthrough-seen', 'true');
    localStorage.removeItem('rally-is-new-signup');
    
    // Persist to database
    if (user) {
      supabase.from('profiles').update({ walkthrough_completed: true } as any).eq('user_id', user.id).then();
    }
    
    // Check for pending squad redirect
    const pendingSquadRedirect = localStorage.getItem('rally-pending-squad-redirect');
    if (pendingSquadRedirect) {
      localStorage.removeItem('rally-pending-squad-redirect');
      navigate(`/squads/${pendingSquadRedirect}`);
    }
  }, [navigate, user]);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('rally-tutorial-complete', 'true');
    localStorage.setItem('rally-walkthrough-seen', 'true');
    localStorage.removeItem('rally-is-new-signup');
    
    // Persist to database
    if (user) {
      supabase.from('profiles').update({ walkthrough_completed: true } as any).eq('user_id', user.id).then();
    }
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStepIndex, endTutorial]);

  const completeAction = useCallback((actionType: string, targetSelector?: string) => {
    if (!currentStep) return;

    // Check if this action matches what we're waiting for
    if (currentStep.requiredAction === 'complete' && actionType === 'complete') {
      nextStep();
    } else if (currentStep.requiredAction === 'tap' && actionType === 'tap') {
      if (!currentStep.targetSelector || targetSelector === currentStep.targetSelector) {
        nextStep();
      }
    } else if (currentStep.requiredAction === 'navigate' && actionType === 'navigate') {
      nextStep();
    }
  }, [currentStep, nextStep]);

  // Check if tutorial should auto-start for new users
  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) return;

    // Database truth: walkthrough already completed
    if ((profile as any).walkthrough_completed === true) return;

    // Gate: wait until name setup is done (flag is authoritative)
    if ((profile as any).needs_name_setup === true) return;
    const dn = (profile.display_name ?? '').trim();
    if (!dn || dn === 'R@lly Member') return;

    // Device guard: already seen on this device
    if (localStorage.getItem('rally-walkthrough-seen') === 'true') return;

    const tutorialComplete = localStorage.getItem('rally-tutorial-complete');
    if (tutorialComplete === 'true') return;

    // Profile-age check: auto-start if profile was created within last 24 hours
    const profileCreated = new Date(profile.created_at || 0).getTime();
    const isNewProfile = profileCreated > Date.now() - 24 * 60 * 60 * 1000;

    if (isNewProfile) {
      // Navigate to home first if not already there
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      // Give the home screen time to fully render
      const timer = setTimeout(() => {
        startTutorial();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, profile, authLoading, startTutorial]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepIndex,
        totalSteps: TUTORIAL_STEPS.length,
        startTutorial,
        endTutorial,
        nextStep,
        completeAction,
        skipTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}