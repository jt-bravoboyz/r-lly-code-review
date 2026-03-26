import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch analytics events
      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('event_name, created_at, user_id, metadata');

      const events = allEvents || [];

      // Fetch real event data
      const { data: rallyEvents } = await supabase
        .from('events')
        .select('id, created_at, status, creator_id');

      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('id, event_id, profile_id, arrived_safely, is_dd, going_home_at, not_participating_rally_home_confirmed, status');

      const { data: feedback } = await supabase
        .from('event_feedback')
        .select('*');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, founding_member, founder_number, created_at');

      // Funnel counts
      const funnelSteps = [
        'event_viewed', 'event_created', 'event_joined',
        'rally_started', 'rally_ended', 'rally_completed', 'safety_confirmed'
      ];
      
      const funnel = funnelSteps.map(step => {
        const matching = events.filter(e => e.event_name === step);
        const uniqueUsers = new Set(matching.map(e => e.user_id).filter(Boolean));
        return { step, total: matching.length, uniqueUsers: uniqueUsers.size };
      });

      // Summary cards
      const totalEventsCreated = rallyEvents?.length || 0;
      const recentEvents = rallyEvents?.filter(e => new Date(e.created_at!) >= sevenDaysAgo).length || 0;
      
      const totalJoined = attendees?.length || 0;
      const viewedCount = events.filter(e => e.event_name === 'event_viewed').length;
      const joinedCount = events.filter(e => e.event_name === 'event_joined').length;
      const conversionRate = viewedCount > 0 ? (joinedCount / viewedCount * 100) : 0;

      const completedEvents = rallyEvents?.filter(e => e.status === 'completed').length || 0;
      const completionRate = totalEventsCreated > 0 ? (completedEvents / totalEventsCreated * 100) : 0;

      const safetyConfirmed = attendees?.filter(a => a.arrived_safely === true).length || 0;
      const goingHome = attendees?.filter(a => a.going_home_at !== null).length || 0;
      const safetyRate = goingHome > 0 ? (safetyConfirmed / goingHome * 100) : 0;

      const inviteCopied = events.filter(e => e.event_name === 'invite_link_copied').length;

      // Safety metrics
      const afterRallyEvents = rallyEvents?.filter(e => e.status === 'completed' || e.status === 'after_rally').length || 0;
      const afterRallyRate = totalEventsCreated > 0 ? (afterRallyEvents / totalEventsCreated * 100) : 0;
      const ddCount = attendees?.filter(a => a.is_dd).length || 0;
      const avgDD = totalEventsCreated > 0 ? ddCount / totalEventsCreated : 0;

      // Growth metrics  
      const userEventCounts: Record<string, number> = {};
      attendees?.forEach(a => {
        userEventCounts[a.profile_id] = (userEventCounts[a.profile_id] || 0) + 1;
      });
      const repeatUsers = Object.values(userEventCounts).filter(c => c >= 2).length;
      const totalUsers = Object.keys(userEventCounts).length;
      const repeatRate = totalUsers > 0 ? (repeatUsers / totalUsers * 100) : 0;

      // Host power ranking
      const hostCounts: Record<string, { created: number; attendeeSum: number; profileId: string }> = {};
      rallyEvents?.forEach(e => {
        if (!hostCounts[e.creator_id]) {
          hostCounts[e.creator_id] = { created: 0, attendeeSum: 0, profileId: e.creator_id };
        }
        hostCounts[e.creator_id].created++;
        const eventAttendees = attendees?.filter(a => a.event_id === e.id).length || 0;
        hostCounts[e.creator_id].attendeeSum += eventAttendees;
      });

      const topHosts = Object.entries(hostCounts)
        .map(([profileId, data]) => ({
          profileId,
          eventsCreated: data.created,
          avgAttendees: data.created > 0 ? Math.round(data.attendeeSum / data.created) : 0,
          displayName: profiles?.find(p => p.id === profileId)?.display_name || 'Unknown',
          avatarUrl: profiles?.find(p => p.id === profileId)?.avatar_url,
        }))
        .sort((a, b) => b.eventsCreated - a.eventsCreated)
        .slice(0, 10);

      // Mode split
      const simpleMode = events.filter(e => {
        if (e.event_name !== 'event_created') return false;
        const meta = e.metadata as Record<string, unknown> | null;
        return meta?.mode === 'simple';
      }).length;
      const logisticsMode = events.filter(e => {
        if (e.event_name !== 'event_created') return false;
        const meta = e.metadata as Record<string, unknown> | null;
        return meta?.mode === 'logistics';
      }).length;

      // Sparkline data (last 7 days)
      const sparkline = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayStr = day.toISOString().split('T')[0];
        return {
          day: dayStr,
          created: rallyEvents?.filter(e => e.created_at?.startsWith(dayStr)).length || 0,
          joined: events.filter(e => e.event_name === 'event_joined' && e.created_at?.startsWith(dayStr)).length || 0,
        };
      });

      // Founders
      const founders = profiles?.filter(p => p.founding_member) || [];

      return {
        summary: {
          totalEventsCreated,
          recentEvents,
          totalJoined,
          conversionRate,
          completionRate,
          safetyRate,
          safetyConfirmed,
          goingHome,
          inviteCopied,
        },
        funnel,
        safety: {
          afterRallyRate,
          avgDD,
          ddCount,
          safetyConfirmed,
          goingHome,
        },
        growth: {
          repeatRate,
          repeatUsers,
          totalUsers,
          topHosts,
        },
        modeSplit: { simpleMode, logisticsMode },
        sparkline,
        founders,
        feedback: feedback || [],
        profiles: profiles || [],
        attendees: attendees || [],
        rallyEvents: rallyEvents || [],
      };
    },
    refetchInterval: 30000,
  });
}
