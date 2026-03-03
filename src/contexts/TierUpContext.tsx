import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useTierUpListener, type TierUpData } from '@/hooks/useBadgeSystem';
import { TierUpModal } from '@/components/badges/TierUpModal';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TierUpContextType {
  showCelebration: (data: TierUpData) => void;
}

const TierUpContext = createContext<TierUpContextType | null>(null);

export function TierUpProvider({ children }: { children: ReactNode }) {
  const [tierUpData, setTierUpData] = useState<TierUpData | null>(null);
  const [showTierUpModal, setShowTierUpModal] = useState(false);
  const { triggerHaptic } = useHaptics();
  const { user } = useAuth();

  const handleTierUp = useCallback((data: TierUpData) => {
    // Guard: don't re-trigger if modal is already showing
    setShowTierUpModal(prev => {
      if (prev) return prev;
      setTierUpData(data);
      triggerHaptic('success');
      return true;
    });
  }, [triggerHaptic]);

  // Global listener for tier-up events (realtime)
  useTierUpListener(handleTierUp);

  // Startup check: catch any tier-ups missed while offline or during modal conflicts
  useEffect(() => {
    if (!user?.id) return;

    const checkUnseen = async () => {
      const { data: state } = await supabase
        .from('rly_user_badge_state')
        .select('last_seen_tier_history_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Find the latest tier history entry for this user
      const { data: latest } = await supabase
        .from('rly_tier_history')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) return;

      const lastSeen = state?.last_seen_tier_history_id ?? 0;
      if (latest.id > lastSeen) {
        // Fetch tier data for the celebration
        const { data: tier } = await supabase
          .from('rly_badge_tiers')
          .select('*')
          .eq('tier_key', latest.to_tier_key)
          .single();

        if (tier) {
          handleTierUp({
            historyId: latest.id,
            fromTier: latest.from_tier_key,
            toTier: tier as any,
            totalPoints: latest.total_points,
          });
        }
      }
    };

    // Delay slightly to let the app settle
    const timer = setTimeout(checkUnseen, 1500);
    return () => clearTimeout(timer);
  }, [user?.id, handleTierUp]);

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
