import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { EventInvite } from '@/hooks/useEventInvites';

export type OnboardingStep = 'idle' | 'invite' | 'rides' | 'location' | 'complete';

interface OnboardingState {
  isActive: boolean;
  currentStep: OnboardingStep;
  eventId: string | null;
  eventTitle: string | null;
  inviteId: string | null;
  invite: EventInvite | null;
}

interface RallyOnboardingContextValue {
  state: OnboardingState;
  startOnboarding: (invite: EventInvite) => void;
  progressToRides: () => void;
  progressToLocation: () => void;
  completeOnboarding: () => void;
  cancelOnboarding: () => void;
  skipToLocation: () => void;
}

const RallyOnboardingContext = createContext<RallyOnboardingContextValue | undefined>(undefined);

const STORAGE_KEY = 'rally_onboarding';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function getPersistedState(): Partial<OnboardingState> | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    if (Date.now() - parsed.startedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistState(state: OnboardingState) {
  if (state.isActive && state.currentStep !== 'idle' && state.currentStep !== 'complete') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      startedAt: Date.now(),
    }));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function RallyOnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    const persisted = getPersistedState();
    if (persisted?.isActive && persisted.currentStep && persisted.currentStep !== 'invite') {
      return {
        isActive: true,
        currentStep: persisted.currentStep as OnboardingStep,
        eventId: persisted.eventId || null,
        eventTitle: persisted.eventTitle || null,
        inviteId: persisted.inviteId || null,
        invite: null,
      };
    }
    return {
      isActive: false,
      currentStep: 'idle',
      eventId: null,
      eventTitle: null,
      inviteId: null,
      invite: null,
    };
  });

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  const startOnboarding = useCallback((invite: EventInvite) => {
    setState({
      isActive: true,
      currentStep: 'invite',
      eventId: invite.event_id,
      eventTitle: invite.event?.title || null,
      inviteId: invite.id,
      invite,
    });
  }, []);

  const progressToRides = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'rides',
    }));
  }, []);

  const progressToLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'location',
    }));
  }, []);

  const skipToLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'location',
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState({
      isActive: false,
      currentStep: 'complete',
      eventId: null,
      eventTitle: null,
      inviteId: null,
      invite: null,
    });
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const cancelOnboarding = useCallback(() => {
    setState({
      isActive: false,
      currentStep: 'idle',
      eventId: null,
      eventTitle: null,
      inviteId: null,
      invite: null,
    });
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RallyOnboardingContext.Provider
      value={{
        state,
        startOnboarding,
        progressToRides,
        progressToLocation,
        completeOnboarding,
        cancelOnboarding,
        skipToLocation,
      }}
    >
      {children}
    </RallyOnboardingContext.Provider>
  );
}

export function useRallyOnboarding() {
  const context = useContext(RallyOnboardingContext);
  if (!context) {
    throw new Error('useRallyOnboarding must be used within RallyOnboardingProvider');
  }
  return context;
}
