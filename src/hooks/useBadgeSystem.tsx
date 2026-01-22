import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
export interface BadgeTier {
  tier_key: string;
  tier_name: string;
  min_points: number;
  max_points: number | null;
  sort_order: number;
  icon_path: string | null;
  gradient: string | null;
  accent_color: string | null;
  congrats_title: string;
  congrats_body: string;
}

export interface UserBadgeState {
  user_id: string;
  total_points: number;
  current_tier_key: string | null;
  last_tier_key: string | null;
  last_seen_tier_history_id: number | null;
  updated_at: string;
}

export interface ActivityBadge {
  badge_key: string;
  badge_name: string;
  description: string;
  icon_path: string | null;
  icon_svg: string | null;
  requirement_event_type: string;
  requirement_count: number;
}

export interface UserActivityBadge {
  user_id: string;
  badge_key: string;
  progress_count: number;
  earned_at: string | null;
  updated_at: string;
}

export interface PointLedgerEntry {
  id: number;
  user_id: string;
  event_type: string;
  points: number;
  source_id: string | null;
  created_at: string;
  created_date: string;
}

export interface TierUpData {
  historyId: number;
  fromTier: string | null;
  toTier: BadgeTier;
  totalPoints: number;
}

export interface PointRule {
  event_type: string;
  points: number;
  description: string;
  is_active: boolean;
  daily_cap: number | null;
}

// Fetch all tier definitions
export function useAllTiers() {
  return useQuery({
    queryKey: ['badge-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rly_badge_tiers')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as BadgeTier[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

// Fetch all point rules
export function usePointRules() {
  return useQuery({
    queryKey: ['point-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rly_point_rules')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as PointRule[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

// Fetch user's current badge state with client-side next tier calculation
export function useBadgeState() {
  const { user } = useAuth();
  const { data: allTiers } = useAllTiers();

  const { data: state, isLoading, error } = useQuery({
    queryKey: ['badge-state', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('rly_user_badge_state')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserBadgeState | null;
    },
    enabled: !!user?.id,
  });

  // Get current tier data
  const currentTier = useMemo(() => {
    if (!allTiers || !state?.current_tier_key) return null;
    return allTiers.find(t => t.tier_key === state.current_tier_key) || null;
  }, [allTiers, state]);

  // Compute next tier client-side using sort_order
  const nextTier = useMemo(() => {
    if (!allTiers || !currentTier) return null;
    return allTiers.find(t => t.sort_order === currentTier.sort_order + 1) || null;
  }, [allTiers, currentTier]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    const totalPoints = state?.total_points || 0;
    
    if (!currentTier || !nextTier) {
      return { 
        current: totalPoints, 
        next: currentTier?.min_points || 0, 
        percent: currentTier ? 100 : 0,
        pointsToNext: 0
      };
    }
    
    const currentMin = currentTier.min_points;
    const nextMin = nextTier.min_points;
    const inTier = totalPoints - currentMin;
    const tierRange = nextMin - currentMin;
    const percent = Math.min(100, Math.max(0, (inTier / tierRange) * 100));
    
    return {
      current: totalPoints,
      next: nextMin,
      percent,
      pointsToNext: Math.max(0, nextMin - totalPoints)
    };
  }, [state, currentTier, nextTier]);

  return { 
    state, 
    currentTier, 
    nextTier, 
    progress, 
    isLoading, 
    error,
    allTiers
  };
}

// Fetch all activity badge definitions
export function useActivityBadgeDefinitions() {
  return useQuery({
    queryKey: ['activity-badge-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rly_activity_badges')
        .select('*');
      
      if (error) throw error;
      return data as ActivityBadge[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

// Fetch user's activity badge progress
export function useActivityBadges() {
  const { user } = useAuth();
  const { data: definitions } = useActivityBadgeDefinitions();

  const { data: userProgress, isLoading } = useQuery({
    queryKey: ['user-activity-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('rly_user_activity_badges')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserActivityBadge[];
    },
    enabled: !!user?.id,
  });

  // Combine definitions with user progress
  const badges = useMemo(() => {
    if (!definitions) return [];

    return definitions.map(badge => {
      const progress = userProgress?.find(p => p.badge_key === badge.badge_key);
      return {
        ...badge,
        progress_count: progress?.progress_count || 0,
        earned_at: progress?.earned_at || null,
        isEarned: !!progress?.earned_at,
      };
    });
  }, [definitions, userProgress]);

  return { badges, isLoading };
}

// Fetch points history (ledger)
export function usePointsHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['points-history', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('rly_points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PointLedgerEntry[];
    },
    enabled: !!user?.id,
  });
}

// Real-time tier-up detection with deduplication
export function useTierUpListener(onTierUp: (data: TierUpData) => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`tier-up-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rly_tier_history',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const historyId = payload.new.id as number;
        
        // Check if already seen
        const { data: state } = await supabase
          .from('rly_user_badge_state')
          .select('last_seen_tier_history_id')
          .eq('user_id', user.id)
          .single();

        if (state?.last_seen_tier_history_id && state.last_seen_tier_history_id >= historyId) {
          return; // Already seen this tier-up
        }

        // Fetch tier data
        const { data: tier } = await supabase
          .from('rly_badge_tiers')
          .select('*')
          .eq('tier_key', payload.new.to_tier_key)
          .single();

        if (tier) {
          onTierUp({
            historyId,
            fromTier: payload.new.from_tier_key,
            toTier: tier as BadgeTier,
            totalPoints: payload.new.total_points,
          });
        }

        // Invalidate badge state to refresh
        queryClient.invalidateQueries({ queryKey: ['badge-state'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onTierUp, queryClient]);
}

// Mark tier-up as seen (call when modal closes)
export function useMarkTierSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (historyId: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase.rpc('rly_mark_tier_seen', {
        p_user_id: user.id,
        p_history_id: historyId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-state'] });
    },
  });
}

// Award points by user_id (for direct use when user.id is available)
export function useAwardPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      eventType, 
      sourceId 
    }: { 
      userId: string; 
      eventType: string; 
      sourceId?: string;
    }) => {
      const { data, error } = await supabase.rpc('rly_award_points', {
        p_user_id: userId,
        p_event_type: eventType,
        p_source_id: sourceId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-state'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity-badges'] });
    },
  });
}

// Award points by profile_id (for hooks that only have profile_id)
export function useAwardPointsByProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      eventType, 
      sourceId 
    }: { 
      profileId: string; 
      eventType: string; 
      sourceId?: string;
    }) => {
      const { data, error } = await supabase.rpc('rly_award_points_by_profile', {
        p_profile_id: profileId,
        p_event_type: eventType,
        p_source_id: sourceId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-state'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity-badges'] });
    },
  });
}
