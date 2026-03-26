import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAILS = ['jt@bravoboyz.com', 'eric@bravoboyz.com', 'nick@bravoboyz.com'];

export function useAdminAnalytics(filterAdminData = false) {
  return useQuery({
    queryKey: ['admin-analytics', filterAdminData],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch analytics events (paginated)
      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('event_name, created_at, user_id, metadata')
        .range(0, 9999);

      let events = allEvents || [];

      // Fetch profiles first for filtering
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, founding_member, founder_number, created_at')
        .range(0, 9999);

      // Get admin profile IDs for filtering
      let adminProfileIds: Set<string> = new Set();
      let adminUserIds: Set<string> = new Set();
      if (filterAdminData && profiles) {
        // Look up user_ids for admin emails via auth - use profiles table instead
        // We match by checking which profiles belong to admin users
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        
        if (adminUsers) {
          adminUserIds = new Set(adminUsers.map(u => u.user_id));
          profiles.forEach(p => {
            if (adminUserIds.has(p.user_id)) {
              adminProfileIds.add(p.id);
            }
          });
        }
      }

      // Filter out admin data in partner view
      if (filterAdminData && adminUserIds.size > 0) {
        events = events.filter(e => !e.user_id || !adminUserIds.has(e.user_id));
      }

      // Fetch real event data (paginated)
      const { data: rallyEvents } = await supabase
        .from('events')
        .select('id, created_at, status, creator_id')
        .range(0, 9999);

      const { data: rawAttendees } = await supabase
        .from('event_attendees')
        .select('id, event_id, profile_id, arrived_safely, is_dd, going_home_at, not_participating_rally_home_confirmed, status')
        .range(0, 9999);

      const { data: feedback } = await supabase
        .from('event_feedback')
        .select('*')
        .range(0, 4999);

      // Filter admin data in partner view
      let filteredRallyEvents = rallyEvents || [];
      let attendees = rawAttendees || [];
      if (filterAdminData && adminProfileIds.size > 0) {
        filteredRallyEvents = filteredRallyEvents.filter(e => !adminProfileIds.has(e.creator_id));
        attendees = attendees.filter(a => !adminProfileIds.has(a.profile_id));
      }

      // Full 9-step funnel
      const funnelSteps = [
        'event_viewed', 'event_created', 'event_joined',
        'rally_started', 'rally_ended', 'rally_completed',
        'safety_confirmed', 'invite_link_copied', 'rally_home_opened'
      ];
      
      const funnel = funnelSteps.map(step => {
        const matching = events.filter(e => e.event_name === step);
        const uniqueUsers = new Set(matching.map(e => e.user_id).filter(Boolean));
        return { step, total: matching.length, uniqueUsers: uniqueUsers.size };
      });

      // Summary cards
      const totalEventsCreated = filteredRallyEvents.length;
      const recentEvents = filteredRallyEvents.filter(e => new Date(e.created_at!) >= sevenDaysAgo).length;
      
      const totalJoined = attendees.length;
      const viewedCount = events.filter(e => e.event_name === 'event_viewed').length;
      const joinedCount = events.filter(e => e.event_name === 'event_joined').length;
      const conversionRate = viewedCount > 0 ? (joinedCount / viewedCount * 100) : 0;

      const completedEvents = filteredRallyEvents.filter(e => e.status === 'completed').length;
      const completionRate = totalEventsCreated > 0 ? (completedEvents / totalEventsCreated * 100) : 0;

      const safetyConfirmed = attendees.filter(a => a.arrived_safely === true).length;
      const goingHome = attendees.filter(a => a.going_home_at !== null).length;
      const safetyRate = goingHome > 0 ? (safetyConfirmed / goingHome * 100) : 0;

      const inviteCopied = events.filter(e => e.event_name === 'invite_link_copied').length;

      // K-Factor
      const kFactor = totalEventsCreated > 0 ? (inviteCopied / totalEventsCreated) : 0;

      // Safety metrics
      const afterRallyEvents = filteredRallyEvents.filter(e => e.status === 'completed' || e.status === 'after_rally').length;
      const afterRallyRate = totalEventsCreated > 0 ? (afterRallyEvents / totalEventsCreated * 100) : 0;
      const ddCount = attendees.filter(a => a.is_dd).length;
      const avgDD = totalEventsCreated > 0 ? ddCount / totalEventsCreated : 0;

      // Growth metrics  
      const userEventCounts: Record<string, number> = {};
      attendees.forEach(a => {
        userEventCounts[a.profile_id] = (userEventCounts[a.profile_id] || 0) + 1;
      });
      const repeatUsers = Object.values(userEventCounts).filter(c => c >= 2).length;
      const totalUsers = Object.keys(userEventCounts).length;
      const repeatRate = totalUsers > 0 ? (repeatUsers / totalUsers * 100) : 0;

      // Host power ranking
      const hostCounts: Record<string, { created: number; attendeeSum: number; profileId: string }> = {};
      filteredRallyEvents.forEach(e => {
        if (!hostCounts[e.creator_id]) {
          hostCounts[e.creator_id] = { created: 0, attendeeSum: 0, profileId: e.creator_id };
        }
        hostCounts[e.creator_id].created++;
        const eventAttendees = attendees.filter(a => a.event_id === e.id).length;
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
          created: filteredRallyEvents.filter(e => e.created_at?.startsWith(dayStr)).length,
          joined: events.filter(e => e.event_name === 'event_joined' && e.created_at?.startsWith(dayStr)).length,
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
          kFactor,
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
        attendees,
        rallyEvents: filteredRallyEvents,
      };
    },
    refetchInterval: 30000,
  });
}
