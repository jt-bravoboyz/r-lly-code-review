import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DatePreset } from '@/components/admin/AdminDateFilter';

function getDateCutoff(preset: DatePreset): Date | null {
  const now = new Date();
  switch (preset) {
    case 'today': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

export function useAdminAnalytics(filterAdminData = false, datePreset: DatePreset = 'all') {
  return useQuery({
    queryKey: ['admin-analytics', filterAdminData, datePreset],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dateCutoff = getDateCutoff(datePreset);

      // Fetch analytics events
      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('event_name, created_at, user_id, metadata')
        .range(0, 9999);

      let events = allEvents || [];

      // Fetch profiles (include referred_by for referral tracking)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, founding_member, founder_number, created_at, referred_by')
        .range(0, 9999);

      // Get ALL admin user IDs from user_roles (any role = admin user)
      let adminProfileIds: Set<string> = new Set();
      let adminUserIds: Set<string> = new Set();
      if (filterAdminData && profiles) {
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id');
        
        if (adminUsers) {
          adminUserIds = new Set(adminUsers.map(u => u.user_id));
          profiles.forEach(p => {
            if (adminUserIds.has(p.user_id)) {
              adminProfileIds.add(p.id);
            }
          });
        }
      }

      // Filter out admin data
      if (filterAdminData && adminUserIds.size > 0) {
        events = events.filter(e => !e.user_id || !adminUserIds.has(e.user_id));
      }

      // Apply date filter to analytics events
      if (dateCutoff) {
        events = events.filter(e => e.created_at && new Date(e.created_at) >= dateCutoff);
      }

      // Fetch real event data
      const { data: rallyEvents } = await supabase
        .from('events')
        .select('id, created_at, status, creator_id, cover_charge, location_name')
        .range(0, 9999);

      const { data: rawAttendees } = await supabase
        .from('event_attendees')
        .select('id, event_id, profile_id, arrived_safely, is_dd, going_home_at, not_participating_rally_home_confirmed, status, arrival_transport_mode, departure_transport_mode, departure_provider')
        .range(0, 9999);

      const { data: feedback } = await supabase
        .from('event_feedback')
        .select('*')
        .range(0, 4999);

      // Fetch venue_presence for dwell time
      const { data: venuePresence } = await supabase
        .from('venue_presence')
        .select('entered_at, last_seen_at')
        .range(0, 9999);

      // Filter admin data
      let filteredRallyEvents = rallyEvents || [];
      let attendees = rawAttendees || [];
      if (filterAdminData && adminProfileIds.size > 0) {
        filteredRallyEvents = filteredRallyEvents.filter(e => !adminProfileIds.has(e.creator_id));
        attendees = attendees.filter(a => !adminProfileIds.has(a.profile_id));
      }

      // Apply date filter to events and attendees
      if (dateCutoff) {
        filteredRallyEvents = filteredRallyEvents.filter(e => e.created_at && new Date(e.created_at) >= dateCutoff);
        // Filter attendees to only those in date-filtered events
        const filteredEventIds = new Set(filteredRallyEvents.map(e => e.id));
        attendees = attendees.filter(a => filteredEventIds.has(a.event_id));
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

      // Commercial metrics
      const paidEvents = filteredRallyEvents.filter(e => e.cover_charge && Number(e.cover_charge) > 0);
      const totalGMV = paidEvents.reduce((sum, e) => sum + (Number(e.cover_charge) || 0), 0);
      const paidEventsCount = paidEvents.length;

      // Event density by city
      const cityMap: Record<string, number> = {};
      filteredRallyEvents.forEach(e => {
        const loc = e.location_name;
        if (loc) {
          cityMap[loc] = (cityMap[loc] || 0) + 1;
        }
      });
      const eventsByCity = Object.entries(cityMap)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

      // Transit metrics
      const arrivalModeCounts: Record<string, number> = {};
      const departureModeCounts: Record<string, number> = {};
      const providerSplit: Record<string, number> = {};
      attendees.forEach(a => {
        const arrival = a.arrival_transport_mode;
        const departure = a.departure_transport_mode;
        const provider = a.departure_provider;
        if (arrival) arrivalModeCounts[arrival] = (arrivalModeCounts[arrival] || 0) + 1;
        if (departure) departureModeCounts[departure] = (departureModeCounts[departure] || 0) + 1;
        if (provider) providerSplit[provider] = (providerSplit[provider] || 0) + 1;
      });

      // Retention metrics
      const totalUsersCount = profiles?.length || 0;
      const timeWindows = [
        { key: 'dau', ms: 1 * 24 * 60 * 60 * 1000 },
        { key: 'wau', ms: 7 * 24 * 60 * 60 * 1000 },
        { key: 'mau', ms: 30 * 24 * 60 * 60 * 1000 },
        { key: 'threeMonth', ms: 90 * 24 * 60 * 60 * 1000 },
        { key: 'sixMonth', ms: 180 * 24 * 60 * 60 * 1000 },
        { key: 'yearly', ms: 365 * 24 * 60 * 60 * 1000 },
      ];
      // Use unfiltered analytics for retention (not date-filtered)
      const allAnalytics = allEvents || [];
      const filteredAnalytics = filterAdminData && adminUserIds.size > 0
        ? allAnalytics.filter(e => !e.user_id || !adminUserIds.has(e.user_id))
        : allAnalytics;
      const retention: Record<string, number> = { totalUsers: totalUsersCount };
      timeWindows.forEach(({ key, ms }) => {
        const cutoff = new Date(now.getTime() - ms);
        const unique = new Set(filteredAnalytics.filter(e => e.created_at && new Date(e.created_at) >= cutoff).map(e => e.user_id).filter(Boolean));
        retention[key] = unique.size;
      });

      // === NEW METRICS ===

      // Avg Squad Size
      const avgSquadSize = totalEventsCreated > 0 ? attendees.length / totalEventsCreated : 0;

      // Peak Activity (60-min lead-up window)
      const rallyStartedEvents = filteredAnalytics.filter(e => e.event_name === 'rally_started' && e.created_at);
      const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      let peakActivity: { label: string } | null = null;
      if (rallyStartedEvents.length > 0) {
        const buckets: Record<string, number> = {};
        rallyStartedEvents.forEach(e => {
          const d = new Date(e.created_at!);
          const key = `${d.getDay()}-${d.getHours()}`;
          buckets[key] = (buckets[key] || 0) + 1;
        });
        const peakKey = Object.entries(buckets).sort(([, a], [, b]) => b - a)[0]?.[0];
        if (peakKey) {
          const [dayIdx, hourStr] = peakKey.split('-');
          const peakHour = parseInt(hourStr);
          // 60-min lead-up: one hour before
          const leadHour = peakHour === 0 ? 23 : peakHour - 1;
          const fmt = (h: number) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${h12}:00 ${ampm}`;
          };
          peakActivity = { label: `${dayNames[parseInt(dayIdx)]}, ${fmt(leadHour)}–${fmt(peakHour)}` };
        }
      }

      // Safety ROI
      const safeDepartures = attendees.filter(a => a.departure_transport_mode !== null).length;

      // Transit Latency
      let transitLatency: number | null = null;
      const endedEvents = filteredAnalytics.filter(e => e.event_name === 'rally_ended');
      const homeEvents = filteredAnalytics.filter(e => e.event_name === 'rally_home_opened');
      if (endedEvents.length > 0 && homeEvents.length > 0) {
        const latencies: number[] = [];
        // Group by user_id, find pairs
        const endedByUser: Record<string, Date[]> = {};
        const homeByUser: Record<string, Date[]> = {};
        endedEvents.forEach(e => {
          if (e.user_id && e.created_at) {
            if (!endedByUser[e.user_id]) endedByUser[e.user_id] = [];
            endedByUser[e.user_id].push(new Date(e.created_at));
          }
        });
        homeEvents.forEach(e => {
          if (e.user_id && e.created_at) {
            if (!homeByUser[e.user_id]) homeByUser[e.user_id] = [];
            homeByUser[e.user_id].push(new Date(e.created_at));
          }
        });
        Object.keys(endedByUser).forEach(userId => {
          const ends = endedByUser[userId].sort((a, b) => a.getTime() - b.getTime());
          const homes = homeByUser[userId]?.sort((a, b) => a.getTime() - b.getTime()) || [];
          ends.forEach(endTime => {
            const nextHome = homes.find(h => h > endTime);
            if (nextHome) {
              const diffMin = (nextHome.getTime() - endTime.getTime()) / 60000;
              if (diffMin > 0 && diffMin < 480) latencies.push(diffMin); // cap at 8h
            }
          });
        });
        if (latencies.length > 0) {
          transitLatency = latencies.reduce((s, v) => s + v, 0) / latencies.length;
        }
      }

      // Avg Dwell Time
      let avgDwellTime: number | null = null;
      if (venuePresence && venuePresence.length > 0) {
        const diffs: number[] = [];
        venuePresence.forEach(vp => {
          if (vp.entered_at && vp.last_seen_at) {
            const diff = (new Date(vp.last_seen_at).getTime() - new Date(vp.entered_at).getTime()) / 60000;
            if (diff > 0 && diff < 1440) diffs.push(diff); // cap at 24h
          }
        });
        if (diffs.length > 0) {
          avgDwellTime = diffs.reduce((s, v) => s + v, 0) / diffs.length;
        }
      }

      // Referral counts per profile
      const referralCounts: Record<string, number> = {};
      (profiles || []).forEach(p => {
        const ref = (p as any).referred_by;
        if (ref) {
          referralCounts[ref] = (referralCounts[ref] || 0) + 1;
        }
      });

      // Top Connectors leaderboard
      const topConnectors = Object.entries(referralCounts)
        .map(([profileId, count]) => ({
          profileId,
          referralCount: count,
          displayName: profiles?.find(p => p.id === profileId)?.display_name || 'Unknown',
          avatarUrl: profiles?.find(p => p.id === profileId)?.avatar_url,
        }))
        .sort((a, b) => b.referralCount - a.referralCount)
        .slice(0, 10);

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
        commercial: {
          totalGMV,
          paidEventsCount,
          eventsByCity,
        },
        transit: {
          arrivalModeCounts,
          departureModeCounts,
          providerSplit,
        },
        retention,
        avgSquadSize,
        peakActivity,
        safeDepartures,
        transitLatency,
        avgDwellTime,
        referralCounts,
        topConnectors,
      };
    },
    refetchInterval: 30000,
  });
}
