import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTierUpListener, type TierUpData } from '@/hooks/useBadgeSystem';
import { TierUpModal } from '@/components/badges/TierUpModal';
import { useHaptics } from '@/hooks/useHaptics';

interface TierUpContextType {
  showCelebration: (data: TierUpData) => void;
}

const TierUpContext = createContext<TierUpContextType | null>(null);

export function TierUpProvider({ children }: { children: ReactNode }) {
  const [tierUpData, setTierUpData] = useState<TierUpData | null>(null);
  const [showTierUpModal, setShowTierUpModal] = useState(false);
  const { triggerHaptic } = useHaptics();

  const handleTierUp = useCallback((data: TierUpData) => {
    // Guard: don't re-trigger if modal is already showing
    setShowTierUpModal(prev => {
      if (prev) return prev;
      setTierUpData(data);
      triggerHaptic('success');
      return true;
    });
  }, [triggerHaptic]);

  // Global listener for tier-up events
  useTierUpListener(handleTierUp);

  const showCelebration = useCallback((data: TierUpData) => {
    handleTierUp(data);
  }, [handleTierUp]);

  return (
    <TierUpContext.Provider value={{ showCelebration }}>
      {children}
      <TierUpModal 
        isOpen={showTierUpModal}
        onClose={() => setShowTierUpModal(false)}
        tierUpData={tierUpData}
      />
    </TierUpContext.Provider>
  );
}

export function useTierUpContext() {
  const context = useContext(TierUpContext);
  if (!context) {
    throw new Error('useTierUpContext must be used within a TierUpProvider');
  }
  return context;
}
