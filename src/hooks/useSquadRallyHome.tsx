import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RallyHomeSession {
  id: string;
  squad_id: string;
  event_id: string | null;
  created_by: string;
  name: string | null;
  status: 'active' | 'completed' | 'expired';
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface RallyHomeParticipant {
  id: string;
  session_id: string;
  profile_id: string;
  opted_out: boolean;
  destination_name: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  going_home_at: string | null;
  arrived_safely: boolean;
  arrived_at: string | null;
  is_dd: boolean;
  needs_ride: boolean;
  not_participating_confirmed: boolean | null;
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    full_name?: string | null;
    nickname?: string | null;
    avatar_url: string | null;
  } | null;
}

export function useActiveSquadSession(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-rally-home-session', squadId],
    queryFn: async () => {
      if (!squadId) return { active: null, lastCompleted: null };

      const { data: active } = await supabase
        .from('rally_home_sessions' as any)
        .select('*')
        .eq('squad_id', squadId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: lastCompleted } = await supabase
        .from('rally_home_sessions' as any)
        .select('*')
        .eq('squad_id', squadId)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        active: (active as unknown as RallyHomeSession) || null,
        lastCompleted: (lastCompleted as unknown as RallyHomeSession) || null,
      };
    },
    enabled: !!squadId,
  });
}

export function useSessionParticipants(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const result = useQuery({
    queryKey: ['squad-rally-home-participants', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('rally_home_participants' as any)
        .select('*')
        .eq('session_id', sessionId)
        .eq('opted_out', false);
      if (error) throw error;
      const rows = (data as unknown as RallyHomeParticipant[]) || [];
      const profileIds = rows.map((r) => r.profile_id);
      if (profileIds.length === 0) return rows;
      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, full_name, nickname, avatar_url')
        .in('id', profileIds);
      const map = new Map(profiles?.map((p) => [p.id, p]) || []);
      return rows.map((r) => ({ ...r, profile: map.get(r.profile_id) || null }));
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) return;
    if (channelRef.current) return;
    const channel = supabase
      .channel(`squad-rally-home-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rally_home_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['squad-rally-home-participants', sessionId],
          });
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [sessionId, queryClient]);

  return result;
}

export function useMySessionParticipant(sessionId: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['squad-rally-home-my-participant', sessionId, profile?.id],
    queryFn: async () => {
      if (!sessionId || !profile?.id) return null;
      const { data, error } = await supabase
        .from('rally_home_participants' as any)
        .select('*')
        .eq('session_id', sessionId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RallyHomeParticipant) || null;
    },
    enabled: !!sessionId && !!profile?.id,
  });
}

export function useStartSquadSession(squadId: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Fetch members + owner
      const { data: squad } = await supabase
        .from('squads')
        .select('owner_id')
        .eq('id', squadId)
        .maybeSingle();
      const { data: members } = await supabase
        .from('squad_members')
        .select('profile_id')
        .eq('squad_id', squadId);

      const memberIds = new Set<string>();
      if (squad?.owner_id) memberIds.add(squad.owner_id);
      (members || []).forEach((m) => m.profile_id && memberIds.add(m.profile_id));

      const { data: session, error: sessionError } = await supabase
        .from('rally_home_sessions' as any)
        .insert({ squad_id: squadId, created_by: profile.id })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const sessionRow = session as unknown as RallyHomeSession;

      const participantRows = Array.from(memberIds).map((pid) => ({
        session_id: sessionRow.id,
        profile_id: pid,
      }));

      if (participantRows.length > 0) {
        const { error: pErr } = await supabase
          .from('rally_home_participants' as any)
          .insert(participantRows);
        if (pErr) throw pErr;
      }

      return sessionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-rally-home-session', squadId] });
    },
  });
}

export function useEndSquadSession(squadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('rally_home_sessions' as any)
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-rally-home-session', squadId] });
    },
  });
}

export interface ParticipantUpdate {
  going_home_at?: string | null;
  arrived_safely?: boolean;
  arrived_at?: string | null;
  destination_name?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  is_dd?: boolean;
  needs_ride?: boolean;
  opted_out?: boolean;
  not_participating_confirmed?: boolean | null;
}

export function useUpdateMyParticipantStatus(sessionId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: ParticipantUpdate) => {
      if (!sessionId || !profile?.id) throw new Error('Missing session/profile');
      const { error } = await supabase
        .from('rally_home_participants' as any)
        .update(updates)
        .eq('session_id', sessionId)
        .eq('profile_id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-rally-home-participants', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['squad-rally-home-my-participant', sessionId, profile?.id] });
    },
  });
}
