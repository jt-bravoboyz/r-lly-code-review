import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from './useAuth';

export interface TutorialStep {
  id: string;
  title: string;
  command: string;
  instruction: string;
  targetSelector?: string;
  requiredAction: 'tap' | 'navigate' | 'scroll' | 'complete';
  targetRoute?: string;
  position?: 'top' | 'bottom' | 'center';
  ctaButton?: {
    label: string;
    route: string;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'ATTENTION, RECRUIT!',
    command: 'ORIENTATION BRIEFING',
    instruction: 'Welcome to R@lly HQ. This is your basic training. Complete each mission to unlock the app. Tap CONTINUE to begin.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'nav-intro',
    title: 'NAVIGATION TRAINING',
    command: 'LOCATE YOUR COMMAND CENTER',
    instruction: 'The bottom bar is your navigation hub. This is how you move through the app. Identify and TAP the home icon now.',
    targetSelector: '[data-tutorial="nav-home"]',
    requiredAction: 'tap',
    position: 'top',
  },
  {
    id: 'events-intro',
    title: 'MISSION CONTROL',
    command: 'ACCESS EVENT OPERATIONS',
    instruction: 'Events are called "R@llies." This is where you create and join spontaneous hangouts. TAP the Events tab to proceed.',
    targetSelector: '[data-tutorial="nav-events"]',
    requiredAction: 'navigate',
    targetRoute: '/events',
    position: 'top',
  },
  {
    id: 'quick-rally',
    title: 'RAPID DEPLOYMENT',
    command: 'UNDERSTAND QUICK RALLY',
    instruction: 'Quick Rally lets you start an instant meetup in seconds. Locate the Quick Rally card. TAP CONTINUE when ready.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'squads-intro',
    title: 'SQUAD FORMATION',
    command: 'ACCESS YOUR UNITS',
    instruction: 'Squads are your trusted groups. Create squads to rally your crew faster. TAP the Squads tab now.',
    targetSelector: '[data-tutorial="nav-squads"]',
    requiredAction: 'navigate',
    targetRoute: '/squads',
    position: 'top',
  },
  {
    id: 'rides-intro',
    title: 'TRANSPORT LOGISTICS',
    command: 'COORDINATE RIDES',
    instruction: 'Need a ride or can offer one? Rides are coordinated within each event. Open an event to access the Rides tab.',
    targetSelector: '[data-tutorial="nav-events"]',
    requiredAction: 'navigate',
    targetRoute: '/events',
    position: 'top',
  },
  {
    id: 'notifications',
    title: 'COMMS CENTER',
    command: 'MONITOR INCOMING SIGNALS',
    instruction: 'The bell icon shows notifications. Stay alert for rally updates and squad invites. TAP CONTINUE.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'badges-intro',
    title: 'BADGES AND RANKS',
    command: 'EARN YOUR STRIPES',
    instruction: 'Earn points by joining R@llys, hosting, driving, inviting friends, and building squads. Rise through Bronze to Dark Matter!',
    requiredAction: 'complete',
    position: 'center',
    ctaButton: {
      label: 'View Badges',
      route: '/achievements',
    },
  },
  {
    id: 'graduation',
    title: 'TRAINING COMPLETE!',
    command: 'YOU ARE NOW RALLY-READY',
    instruction: 'Outstanding work, recruit! You\'ve completed basic training. You\'re cleared for active duty. Go rally your squad!',
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
  const { user, loading: authLoading } = useAuth();

  const currentStep = isActive ? TUTORIAL_STEPS[currentStepIndex] : null;

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('rally-tutorial-complete', 'true');
    // Clear the new signup flag since tutorial is complete
    localStorage.removeItem('rally-is-new-signup');
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('rally-tutorial-complete', 'true');
    // Clear the new signup flag since tutorial was skipped
    localStorage.removeItem('rally-is-new-signup');
  }, []);

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

  // Check if tutorial should auto-start for new signups ONLY
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Must be logged in
    if (!user) return;
    
    const tutorialComplete = localStorage.getItem('rally-tutorial-complete');
    const isNewSignup = localStorage.getItem('rally-is-new-signup');
    const onboardingComplete = localStorage.getItem('rally-onboarding-complete');
    
    // Only start tutorial if:
    // 1. User is logged in (checked above)
    // 2. This is a new signup (flag set during signUp)
    // 3. Tutorial hasn't been completed yet
    // 4. Onboarding is complete (if applicable)
    if (isNewSignup === 'true' && tutorialComplete !== 'true' && onboardingComplete === 'true') {
      // Small delay to let the app settle
      const timer = setTimeout(() => {
        startTutorial();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, startTutorial]);

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