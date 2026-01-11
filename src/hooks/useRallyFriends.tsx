import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RallyFriend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  isSquadMate: boolean;
  squadSymbols: { squadId: string; squadName: string; symbol: string }[];
}

export function useRallyFriends() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['rally-friends', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get all profiles that user is connected to via events
      const { data: eventConnections, error: eventError } = await supabase
        .from('event_attendees')
        .select(`
          profile_id,
          event_id
        `)
        .neq('profile_id', profile.id);

      if (eventError) throw eventError;

      // Get events the current user has attended
      const { data: myEvents, error: myEventsError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      if (myEventsError) throw myEventsError;

      const myEventIds = new Set(myEvents?.map(e => e.event_id) || []);
      
      // Filter to only profiles from events user attended
      const connectedProfileIds = new Set(
        eventConnections
          ?.filter(ec => myEventIds.has(ec.event_id))
          .map(ec => ec.profile_id) || []
      );

      // Get squads where user is owner or member
      const { data: mySquads, error: squadsError } = await supabase
        .from('squads')
        .select(`
          id,
          name,
          symbol,
          owner_id,
          members:squad_members(profile_id)
        `);

      if (squadsError) throw squadsError;

      // Build map of profile -> squads they share with user
      const squadMateMap = new Map<string, { squadId: string; squadName: string; symbol: string }[]>();
      
      mySquads?.forEach(squad => {
        const memberIds = squad.members?.map(m => m.profile_id) || [];
        const isUserInSquad = 
          squad.owner_id === profile.id || 
          memberIds.includes(profile.id);
        
        if (isUserInSquad) {
          // Add all other members as squad mates
          memberIds.forEach(memberId => {
            if (memberId !== profile.id) {
              connectedProfileIds.add(memberId);
              const existing = squadMateMap.get(memberId) || [];
              existing.push({
                squadId: squad.id,
                squadName: squad.name,
                symbol: squad.symbol || 'shield',
              });
              squadMateMap.set(memberId, existing);
            }
          });
          
          // Also add owner if not the current user
          if (squad.owner_id !== profile.id) {
            connectedProfileIds.add(squad.owner_id);
            const existing = squadMateMap.get(squad.owner_id) || [];
            existing.push({
              squadId: squad.id,
              squadName: squad.name,
              symbol: squad.symbol || 'shield',
            });
            squadMateMap.set(squad.owner_id, existing);
          }
        }
      });

      // Fetch profiles for all connected users
      if (connectedProfileIds.size === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(connectedProfileIds));

      if (profilesError) throw profilesError;

      // Map to RallyFriend format
      const friends: RallyFriend[] = (profiles || []).map(p => ({
        id: p.id!,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        isSquadMate: squadMateMap.has(p.id!),
        squadSymbols: squadMateMap.get(p.id!) || [],
      }));

      // Sort: squad mates first, then alphabetically
      friends.sort((a, b) => {
        if (a.isSquadMate !== b.isSquadMate) {
          return a.isSquadMate ? -1 : 1;
        }
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      return friends;
    },
    enabled: !!profile?.id,
  });
}
