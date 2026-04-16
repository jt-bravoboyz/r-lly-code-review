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
  position?: 'top' | 'bottom' | 'center';
  ctaButton?: {
    label: string;
    route: string;
  };
  illustration?: 'safety-dashboard' | 'live-status' | 'badge-ladder';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'WELCOME TO R@LLY',
    command: 'ORIENTATION BRIEF',
    instruction: 'R@lly is how you plan, rally, and make sure everyone gets home safe.\n\nThis quick training will show you the essentials. You\'ll be mission-ready in under a minute.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'nav-intro',
    title: 'YOUR COMMAND CENTER',
    command: 'NAVIGATION TRAINING',
    instruction: 'The bottom bar is your control panel.\n\nHome → Your activity\nR@lly → Create & join events\nAlerts → Invites & updates\nSquads → Your crew\nProfile → Your settings\n\nTap Home now.',
    targetSelector: '[data-tutorial="nav-home"]',
    requiredAction: 'navigate',
    targetRoute: '/',
    position: 'top',
  },
  {
    id: 'events-intro',
    title: 'PLAN THE MISSION',
    command: 'EVENT OPERATIONS',
    instruction: 'Events are called R@llies. Plan one in advance or launch a Quick R@lly for instant meetups.\n\nTap R@lly to see how it works.',
    targetSelector: '[data-tutorial="nav-events"]',
    requiredAction: 'navigate',
    targetRoute: '/events',
    position: 'top',
  },
  {
    id: 'quick-rally',
    title: 'QUICK R@LLY',
    command: 'RAPID DEPLOYMENT',
    instruction: 'Quick R@lly lets you spin up a meetup in seconds. Set a location. Invite your squad. Move out.\n\nPlanning ahead? Use Create Event for date, time, and details.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'squads-intro',
    title: 'BUILD YOUR SQUAD',
    command: 'UNIT FORMATION',
    instruction: 'Squads are your trusted groups. Create one once. Rally them anytime.\n\nTap Squads.',
    targetSelector: '[data-tutorial="nav-squads"]',
    requiredAction: 'navigate',
    targetRoute: '/squads',
    position: 'top',
  },
  {
    id: 'rides-intro',
    title: 'RIDE COORDINATION',
    command: 'TRANSPORT LOGISTICS',
    instruction: 'Inside every R@lly, you can:\n• Offer seats\n• Volunteer as DD\n• Request a pickup\n\nNo more chaotic group texts.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'going-rogue',
    title: 'GOING ROGUE 🔥',
    command: 'THE PLOT TWIST',
    instruction: 'Spontaneity is the vibe. If the night takes you elsewhere, hit \'Going Rogue\'.\n\nIt signals your squad, resets your safety plan, and keeps the night moving on your terms.\n\nYour crew can react — but you\'re off the DD\'s auto-check.',
    requiredAction: 'complete',
    position: 'center',
  },
  {
    id: 'safety-intro',
    title: 'R@LLY HOME',
    command: 'SAFETY SYSTEM',
    instruction: 'When the night winds down, everyone confirms they made it home. Hosts see a live safety dashboard. No one gets left behind.\n\nThis is what makes R@lly different.',
    requiredAction: 'complete',
    position: 'center',
    illustration: 'safety-dashboard',
  },
  {
    id: 'live-tracking-intro',
    title: 'LIVE STATUS',
    command: 'SITUATIONAL AWARENESS',
    instruction: 'During a R@lly, you can share your live status. See who\'s arrived. Who\'s en route. Who\'s still out.\n\nReal-time. No guessing.',
    requiredAction: 'complete',
    position: 'center',
    illustration: 'live-status',
  },
  {
    id: 'alerts-intro',
    title: 'ALERTS',
    command: 'INCOMING SIGNALS',
    instruction: 'Invites, ride updates, squad messages — they all show up in Alerts. Stay in the loop.\n\nTap Alerts.',
    targetSelector: '[data-tutorial="nav-notifications"]',
    requiredAction: 'navigate',
    targetRoute: '/notifications',
    position: 'top',
  },
  {
    id: 'profile-intro',
    title: 'YOUR PROFILE',
    command: 'SETUP YOUR DOSSIER',
    instruction: 'Add your photo. Set your home address. Manage preferences.\n\nSetting your home address powers R@lly Home safety.\n\nTap Profile.',
    targetSelector: '[data-tutorial="nav-profile"]',
    requiredAction: 'navigate',
    targetRoute: '/profile',
    position: 'top',
  },
  {
    id: 'badges-intro',
    title: 'EARN YOUR STRIPES',
    command: 'RANK & RECOGNITION',
    instruction: 'Earn points for:\n• Hosting\n• Driving\n• Joining\n• Inviting\n• Building squads\n\nClimb from Bronze to Dark Matter.',
    requiredAction: 'complete',
    illustration: 'badge-ladder',
    ctaButton: {
      label: 'View Badges',
      route: '/achievements',
    },
  },
  {
    id: 'graduation',
    title: 'TRAINING COMPLETE',
    command: 'YOU\'RE CLEARED',
    instruction: 'You\'re officially R@lly-ready.\nPlan something. Invite your crew. Move out.',
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

    // Duplication guard: if user already saw walkthrough on this device, skip
    if (localStorage.getItem('rally-walkthrough-seen') === 'true') return;

    const tutorialComplete = localStorage.getItem('rally-tutorial-complete');
    if (tutorialComplete === 'true') return;

    const onboardingComplete = localStorage.getItem('rally-onboarding-complete');
    if (onboardingComplete !== 'true') return;

    // Profile-age check: auto-start if profile was created within last 24 hours
    const profileCreated = new Date(profile.created_at || 0).getTime();
    const isNewProfile = profileCreated > Date.now() - 24 * 60 * 60 * 1000;

    // Also allow if explicit new-signup flag is set (immediate signup flow)
    const isNewSignup = localStorage.getItem('rally-is-new-signup') === 'true';

    if (isNewProfile || isNewSignup) {
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