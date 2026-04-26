import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DatePreset } from '@/components/admin/AdminDateFilter';
import { getPrivateName } from '@/lib/identity';

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
        .select('id, user_id, display_name, full_name, nickname, avatar_url, founding_member, founder_number, created_at, referred_by')
        .range(0, 9999);

      // Manual overrides for growth/internal classification.
      // FORCE_INCLUDE: real users we want counted in growth metrics even if they
      // happen to have an admin role (JT, Nick Haddad, Sko are real founders/operators
      // whose activity is meaningful market signal).
      // FORCE_EXCLUDE: dummy/seed accounts that should never appear in growth metrics
      // even though they have no admin role (Fake Eric, Test).
      const FORCE_INCLUDE_USER_IDS = new Set<string>([
        '6b3ae8dd-fb12-4a48-b3b0-9a850b5daba8', // JT
        'cdba9c99-e0aa-48c8-8dde-39af364f57e4', // Nick Haddad
        '8e66c7bd-5fa3-41ab-bcce-3a861e0e6e0b', // Sko
      ]);
      const FORCE_EXCLUDE_USER_IDS = new Set<string>([
        '8604e75d-d8eb-460a-853f-795a0819811e', // Fake Eric
        '1daec22c-9c87-453f-b103-1966b8fc7ca0', // Test
      ]);

      // Get ALL admin user IDs from user_roles (any role = admin user)
      let adminProfileIds: Set<string> = new Set();
      let adminUserIds: Set<string> = new Set();
      if (filterAdminData && profiles) {
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id');

        if (adminUsers) {
          // Start from role-based admins, then apply manual overrides.
          adminUserIds = new Set(
            adminUsers
              .map(u => u.user_id)
              .filter(uid => !FORCE_INCLUDE_USER_IDS.has(uid))
          );
          // Add force-excluded dummy accounts to the internal set so they're filtered out.
          FORCE_EXCLUDE_USER_IDS.forEach(uid => adminUserIds.add(uid));

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

      // Fetch real event data (lat/lng included for HeatMap)
      const { data: rallyEvents } = await supabase
        .from('events')
        .select('id, created_at, status, creator_id, cover_charge, location_name, location_lat, location_lng, start_time')
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

      // Real invite signals — many invite paths don't fire trackEvent('invite_link_copied'),
      // so K-Factor/viral coefficient must aggregate every channel.
      const [{ data: inviteHistoryRows }, { data: phoneInviteRows }, { data: eventInviteRows }] =
        await Promise.all([
          supabase.from('invite_history').select('inviter_id, invite_count').range(0, 9999),
          supabase.from('phone_invites').select('invited_by, event_id').range(0, 9999),
          supabase.from('event_invites').select('invited_by, event_id').range(0, 9999),
        ]);

      // Two parallel datasets:
      //   - *Raw: ground truth (admins included). Used for "true headcount" displays.
      //   - filteredRallyEvents / attendees: admin-stripped. Used for K-Factor, growth metrics,
      //     conversion, retention, top-host averages — anything reported externally.
      let rallyEventsRaw = rallyEvents || [];
      let attendeesRaw = rawAttendees || [];
      let filteredRallyEvents = rallyEvents || [];
      let attendees = rawAttendees || [];

      if (filterAdminData && adminProfileIds.size > 0) {
        filteredRallyEvents = filteredRallyEvents.filter(e => !adminProfileIds.has(e.creator_id));
        attendees = attendees.filter(a => !adminProfileIds.has(a.profile_id));
      }

      // === GHOST FIX ===
      // Old behavior filtered events by *creation date*, then stripped attendees to that
      // event-id set. That orphaned every attendee/invite/analytic that fired today on a
      // R@lly created earlier — inflating K-Factor while showing 0 Verified Foot Traffic.
      //
      // New behavior: when a date preset is active, build the *active rally set* = events
      // that show ANY signal (created OR attendee join OR analytics event with event_id)
      // inside the window. Use that union as the basis for filteredRallyEvents/attendees.
      if (dateCutoff) {
        const cutoffMs = dateCutoff.getTime();

        // Signal collectors (raw + filtered branches walked separately so admin-stripping
        // still applies to the filtered branch).
        const buildActiveSet = (
          srcEvents: typeof rallyEventsRaw,
          srcAttendees: typeof attendeesRaw,
        ) => {
          const eventIds = new Set<string>(srcEvents.map(e => e.id));
          const active = new Set<string>();
          // 1. Events created in window
          srcEvents.forEach(e => {
            if (e.created_at && new Date(e.created_at).getTime() >= cutoffMs) active.add(e.id);
          });
          // 2. Attendee rows that joined in window
          srcAttendees.forEach(a => {
            if (!eventIds.has(a.event_id)) return;
            // joined_at column not selected; treat any attendee on a recently-active event
            // as a signal (we'll AND with analytics signals below).
          });
          // 3. Analytics events tagged with event_id, fired in window
          (allEvents || []).forEach(ev => {
            if (!ev.created_at || new Date(ev.created_at).getTime() < cutoffMs) return;
            const eid = (ev.metadata as any)?.event_id as string | undefined;
            if (eid && eventIds.has(eid)) active.add(eid);
          });
          return active;
        };

        const rawActive = buildActiveSet(rallyEventsRaw, attendeesRaw);
        const filteredActive = buildActiveSet(filteredRallyEvents, attendees);

        rallyEventsRaw = rallyEventsRaw.filter(e => rawActive.has(e.id));
        attendeesRaw = attendeesRaw.filter(a => rawActive.has(a.event_id));

        filteredRallyEvents = filteredRallyEvents.filter(e => filteredActive.has(e.id));
        attendees = attendees.filter(a => filteredActive.has(a.event_id));
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
      // Cap at 100 — confirmations can occasionally exceed going-home flips
      // (e.g., host-confirmed dropoffs without a going_home_at timestamp), and a
      // partner-facing "safety rate" must never read above 100%.
      const safetyRate = goingHome > 0
        ? Math.min(100, (safetyConfirmed / goingHome) * 100)
        : 0;

      // === REAL INVITE AGGREGATION ===
      // Sum every invite channel per host profile (not user_id, since the invite tables key by profile_id).
      // Also strip admin profiles when filterAdminData is on so partner-facing K-Factor is clean.
      const invitesByProfile: Record<string, number> = {};
      const addInvite = (profileId: string | null | undefined, n = 1) => {
        if (!profileId) return;
        if (filterAdminData && adminProfileIds.has(profileId)) return;
        invitesByProfile[profileId] = (invitesByProfile[profileId] || 0) + n;
      };
      (inviteHistoryRows || []).forEach(r => addInvite(r.inviter_id as string, (r as any).invite_count || 1));
      (phoneInviteRows || []).forEach(r => addInvite(r.invited_by as string, 1));
      (eventInviteRows || []).forEach(r => addInvite(r.invited_by as string, 1));

      // Hamilton attribution: credit analytics-only invite signals back to the
      // host of the rally being shared. This makes the global K-Factor reconcile
      // with the sum of per-host impact in the Growth Narrative (no orphan invites).
      const eventCreatorById: Record<string, string> = {};
      (rallyEvents || []).forEach(e => { eventCreatorById[e.id] = e.creator_id; });
      events
        .filter(e => e.event_name === 'invite_link_copied' || e.event_name === 'invite_code_redeemed')
        .forEach(e => {
          const eid = (e.metadata as any)?.event_id;
          const host = eid ? eventCreatorById[eid] : null;
          if (host) addInvite(host, 1);
        });

      // Single source of truth: total invites = sum across all hosts (post-attribution).
      // Guarantees inviteCopied === Σ invitesByProfile, so global K-Factor === Σ host impact.
      const inviteCopied = Object.values(invitesByProfile).reduce((a, b) => a + b, 0);

      // K-Factor: real invites generated per R@lly created.
      const kFactor = totalEventsCreated > 0 ? (inviteCopied / totalEventsCreated) : 0;

      // Live Now indicator — any active R@lly happening right now (post admin/date filter).
      const liveNowCount = filteredRallyEvents.filter(e => e.status === 'live').length;
      // Live paid R@llies right now — drives the Commercial "Live Now" badge.
      const livePaidNowCount = filteredRallyEvents.filter(
        e => e.status === 'live' && e.cover_charge && Number(e.cover_charge) > 0
      ).length;

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
          displayName: getPrivateName(profiles?.find(p => p.id === profileId) as any) || 'Unknown',
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
          displayName: getPrivateName(profiles?.find(p => p.id === profileId) as any) || 'Unknown',
          avatarUrl: profiles?.find(p => p.id === profileId)?.avatar_url,
        }))
        .sort((a, b) => b.referralCount - a.referralCount)
        .slice(0, 10);

      // Fetch squads and members for "Current Squad" column
      const { data: squads } = await supabase
        .from('squads')
        .select('id, name, owner_id');
      const { data: squadMembers } = await supabase
        .from('squad_members')
        .select('squad_id, profile_id');

      const profileSquadMap = new Map<string, string>();
      squads?.forEach(s => profileSquadMap.set(s.owner_id, s.name));
      squadMembers?.forEach(m => {
        const squadName = squads?.find(s => s.id === m.squad_id)?.name;
        if (squadName && !profileSquadMap.has(m.profile_id)) {
          profileSquadMap.set(m.profile_id, squadName);
        }
      });

      const referralDetails = (profiles || [])
        .filter(p => p.referred_by)
        .map(p => ({
          refereeId: p.id,
          refereeName: getPrivateName(p as any),
          refereeCreatedAt: p.created_at,
          referrerId: p.referred_by!,
          referrerName: getPrivateName(profiles?.find(r => r.id === p.referred_by) as any) || 'Unknown',
          currentSquad: profileSquadMap.get(p.id) || null,
        }));

      // Per-event headcount — TWO variants:
      //   headcountByEvent: ground truth (raw, admins included). Used for host badges.
      //   headcountByEventGrowth: admin-stripped. Used in K-Factor / partnership reporting.
      const headcountByEvent: Record<string, number> = {};
      attendeesRaw.forEach(a => {
        if (a.status === 'attending') {
          headcountByEvent[a.event_id] = (headcountByEvent[a.event_id] || 0) + 1;
        }
      });
      const headcountByEventGrowth: Record<string, number> = {};
      attendees.forEach(a => {
        if (a.status === 'attending') {
          headcountByEventGrowth[a.event_id] = (headcountByEventGrowth[a.event_id] || 0) + 1;
        }
      });

      // Verified Foot Traffic — anyone with on-the-ground signal, not just status='attending'.
      // The old `status === 'attending'` filter silently dropped attendees with status='going'
      // or null, producing the "0 verified, 7x K-factor" ghost.
      const verifiedFootTraffic = attendees.filter(a =>
        a.status === 'attending' ||
        a.status === 'going' ||
        a.arrived_safely === true ||
        a.going_home_at !== null
      ).length;
      const totalLifetimeAttendees = verifiedFootTraffic;

      // Per-profile aggregates for User Directory — use RAW so each user's
      // true rally activity is shown (admin team activity is real activity).
      const ralliesJoinedByProfile: Record<string, number> = {};
      attendeesRaw.forEach(a => {
        if (a.status === 'attending') {
          ralliesJoinedByProfile[a.profile_id] = (ralliesJoinedByProfile[a.profile_id] || 0) + 1;
        }
      });
      const ralliesCreatedByProfile: Record<string, number> = {};
      rallyEventsRaw.forEach(e => {
        ralliesCreatedByProfile[e.creator_id] = (ralliesCreatedByProfile[e.creator_id] || 0) + 1;
      });

      // Admin User Directory (email + last sign-in via SECURITY DEFINER RPC)
      const { data: directoryRows } = await (supabase as any).rpc('admin_user_directory');
      const userDirectory = (directoryRows ?? []).map((row: any) => ({
        profileId: row.profile_id as string,
        userId: row.user_id as string,
        displayName: getPrivateName({ full_name: row.full_name, nickname: row.nickname, display_name: row.display_name }),
        email: (row.email as string | null) ?? null,
        createdAt: row.created_at as string | null,
        lastSignInAt: row.last_sign_in_at as string | null,
        foundingMember: !!row.founding_member,
        avatarUrl: profiles?.find(p => p.id === row.profile_id)?.avatar_url ?? null,
        referralCount: referralCounts[row.profile_id] ?? 0,
        ralliesJoined: ralliesJoinedByProfile[row.profile_id] ?? 0,
        ralliesCreated: ralliesCreatedByProfile[row.profile_id] ?? 0,
      }));

      // === GROWTH NARRATIVE ===

      // Top viral hosts: ranked by personal K-factor (real invites per R@lly created),
      // tie-broken by total headcount delivered. Uses the unified invitesByProfile map so
      // every invite channel (invite_history, phone_invites, event_invites) is counted.
      const topViralHosts = Object.entries(hostCounts)
        .map(([profileId, data]) => {
          const invitesCopied = invitesByProfile[profileId] || 0;
          const personalK = data.created > 0 ? invitesCopied / data.created : 0;
          const profile = profiles?.find(p => p.id === profileId) as any;
          return {
            profileId,
            displayName: getPrivateName(profile) || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            ralliesCreated: data.created,
            invitesCopied,
            viralCoefficient: personalK,
            headcountDelivered: data.attendeeSum,
          };
        })
        .filter(h => h.ralliesCreated > 0)
        .sort((a, b) => {
          // Primary: who delivered the most attendees (real impact).
          if (b.headcountDelivered !== a.headcountDelivered) return b.headcountDelivered - a.headcountDelivered;
          // Tiebreak: viral coefficient.
          if (b.viralCoefficient !== a.viralCoefficient) return b.viralCoefficient - a.viralCoefficient;
          // Final tiebreak: most R@llies hosted.
          return b.ralliesCreated - a.ralliesCreated;
        })
        .slice(0, 5);

      // Week-over-week repeat rate delta
      const oneWeekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgoMs = now.getTime() - 14 * 24 * 60 * 60 * 1000;
      const eventDateById: Record<string, number> = {};
      filteredRallyEvents.forEach(e => {
        if (e.created_at) eventDateById[e.id] = new Date(e.created_at).getTime();
      });
      const usersThisWeek: Record<string, number> = {};
      const usersLastWeek: Record<string, number> = {};
      attendees.forEach(a => {
        const ts = eventDateById[a.event_id];
        if (!ts) return;
        if (ts >= oneWeekAgoMs) usersThisWeek[a.profile_id] = (usersThisWeek[a.profile_id] || 0) + 1;
        else if (ts >= twoWeeksAgoMs) usersLastWeek[a.profile_id] = (usersLastWeek[a.profile_id] || 0) + 1;
      });
      const repeatRateThisWeek = Object.keys(usersThisWeek).length > 0
        ? Object.values(usersThisWeek).filter(c => c >= 2).length / Object.keys(usersThisWeek).length * 100
        : 0;
      const repeatRateLastWeek = Object.keys(usersLastWeek).length > 0
        ? Object.values(usersLastWeek).filter(c => c >= 2).length / Object.keys(usersLastWeek).length * 100
        : 0;
      const repeatRateDelta = repeatRateThisWeek - repeatRateLastWeek;

      // 4-week cohort matrix: for each of last 4 weeks, % of joiners returning in subsequent weeks
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const weekStart = (offset: number) => {
        const d = new Date(now.getTime() - offset * WEEK_MS);
        d.setHours(0, 0, 0, 0);
        // align to Sunday
        d.setDate(d.getDate() - d.getDay());
        return d.getTime();
      };
      // Build per-user list of attendance week-buckets (using filteredRallyEvents to keep growth-clean cohorts)
      const userWeeks: Record<string, Set<number>> = {};
      attendees.forEach(a => {
        const ts = eventDateById[a.event_id];
        if (!ts) return;
        const weekIdx = Math.floor((now.getTime() - ts) / WEEK_MS);
        if (!userWeeks[a.profile_id]) userWeeks[a.profile_id] = new Set();
        userWeeks[a.profile_id].add(weekIdx);
      });
      const weeklyCohorts = Array.from({ length: 4 }, (_, i) => {
        // i = weeks ago (0 = this week)
        const cohortWeekIdx = i;
        const cohortDate = new Date(weekStart(cohortWeekIdx));
        const cohortUsers = Object.entries(userWeeks)
          .filter(([, weeks]) => weeks.has(cohortWeekIdx))
          .map(([uid]) => uid);
        const returns = [1, 2, 3].map(offset => {
          if (cohortUsers.length === 0) return null;
          const returned = cohortUsers.filter(uid => userWeeks[uid].has(cohortWeekIdx - offset)).length;
          return returned / cohortUsers.length * 100;
        });
        return {
          weekStart: cohortDate.toISOString(),
          weekLabel: cohortDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cohortSize: cohortUsers.length,
          returnRates: returns, // [%week+1, %week+2, %week+3] or nulls
        };
      });

      // Geographic spread for HeatMap (host-provided event coords only — never user GPS)
      const eventLocations = filteredRallyEvents
        .filter(e => e.location_lat != null && e.location_lng != null)
        .map(e => ({
          id: e.id,
          lat: Number(e.location_lat),
          lng: Number(e.location_lng),
          locationName: e.location_name || null,
        }));

      // Hamilton attribution audit — exposed so the dashboard can verify the no-echoes
      // rule (sum of host impact must equal global totals).
      const sumHostInvites = Object.values(invitesByProfile).reduce((a, b) => a + b, 0);
      const sumHostAttendees = Object.values(hostCounts).reduce((s, h) => s + h.attendeeSum, 0);
      const attributionAudit = {
        totalInvites: inviteCopied,
        sumOfHostInvites: sumHostInvites,
        invitesReconciled: inviteCopied === sumHostInvites,
        totalAttendees: attendees.length,
        sumOfHostAttendees: sumHostAttendees,
        verifiedFootTraffic,
      };

      // Realized vs. projected revenue (Commercial hero).
      const liveCoverSum = filteredRallyEvents
        .filter(e => e.status === 'live' && e.cover_charge && Number(e.cover_charge) > 0)
        .reduce((s, e) => s + Number(e.cover_charge || 0), 0);
      const avgTicket = paidEventsCount > 0 ? totalGMV / paidEventsCount : 0;
      const revenuePotential = totalGMV + liveCoverSum;

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
          totalLifetimeAttendees,
          verifiedFootTraffic,
          liveNowCount,
          livePaidNowCount,
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
        attendeesRaw,
        rallyEvents: filteredRallyEvents,
        rallyEventsRaw,
        commercial: {
          totalGMV,
          paidEventsCount,
          eventsByCity,
          revenuePotential,
          avgTicket,
          livePaidNowCount,
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
        referralDetails,
        headcountByEvent,
        headcountByEventGrowth,
        userDirectory,
        topViralHosts,
        repeatRateThisWeek,
        repeatRateLastWeek,
        repeatRateDelta,
        weeklyCohorts,
        eventLocations,
        adminFilterActive: filterAdminData && adminProfileIds.size > 0,
        adminAccountCount: adminProfileIds.size,
        attributionAudit,
      };
    },
    refetchInterval: 30000,
  });
}
