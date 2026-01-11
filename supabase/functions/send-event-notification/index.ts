import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  type: 'bar_hop_transition' | 'ride_offer' | 'ride_request' | 'ride_response' | 'going_home' | 'arrived_safe' | 'event_update' | 'rally_invite';
  eventId?: string;
  eventTitle?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  targetProfileIds?: string[];
  profileIds?: string[];
  excludeProfileId?: string;
  invitedBy?: string;
}

// Input validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 500;
const MAX_TARGET_PROFILE_IDS = 100;
const VALID_NOTIFICATION_TYPES = ['bar_hop_transition', 'ride_offer', 'ride_request', 'ride_response', 'going_home', 'arrived_safe', 'event_update', 'rally_invite'];

function validatePayload(payload: PushPayload): { valid: boolean; error?: string } {
  // Validate notification type
  if (!payload.type || !VALID_NOTIFICATION_TYPES.includes(payload.type)) {
    return { valid: false, error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}` };
  }

  // For rally_invite, title and body are auto-generated
  if (payload.type === 'rally_invite') {
    if (!payload.eventTitle || typeof payload.eventTitle !== 'string') {
      return { valid: false, error: 'eventTitle is required for rally_invite type' };
    }
    if (!payload.profileIds || !Array.isArray(payload.profileIds) || payload.profileIds.length === 0) {
      return { valid: false, error: 'profileIds is required for rally_invite type' };
    }
  } else {
    // Validate title
    if (!payload.title || typeof payload.title !== 'string') {
      return { valid: false, error: 'Title is required and must be a string' };
    }
    if (payload.title.length > MAX_TITLE_LENGTH) {
      return { valid: false, error: `Title must be ${MAX_TITLE_LENGTH} characters or less` };
    }

    // Validate body
    if (!payload.body || typeof payload.body !== 'string') {
      return { valid: false, error: 'Body is required and must be a string' };
    }
    if (payload.body.length > MAX_BODY_LENGTH) {
      return { valid: false, error: `Body must be ${MAX_BODY_LENGTH} characters or less` };
    }
  }

  // Validate targetProfileIds if provided
  if (payload.targetProfileIds) {
    if (!Array.isArray(payload.targetProfileIds)) {
      return { valid: false, error: 'targetProfileIds must be an array' };
    }
    if (payload.targetProfileIds.length > MAX_TARGET_PROFILE_IDS) {
      return { valid: false, error: `Cannot target more than ${MAX_TARGET_PROFILE_IDS} profiles` };
    }
    // Validate UUID format for each profile ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of payload.targetProfileIds) {
      if (!uuidRegex.test(id)) {
        return { valid: false, error: `Invalid profile ID format: ${id}` };
      }
    }
  }

  // Validate eventId if provided
  if (payload.eventId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.eventId)) {
      return { valid: false, error: 'Invalid eventId format' };
    }
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's auth token to verify identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Invalid authentication:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the caller's profile ID
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !callerProfile) {
      console.error('Could not find caller profile:', profileError?.message);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerProfileId = callerProfile.id;

    // ========== INPUT VALIDATION ==========
    const payload: PushPayload = await req.json();
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('Payload validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, eventId, eventTitle, title, body, data, targetProfileIds, profileIds: payloadProfileIds, excludeProfileId, invitedBy } = payload;

    // Handle rally_invite type with auto-generated title/body
    let notifTitle = title;
    let notifBody = body;
    
    if (type === 'rally_invite') {
      notifTitle = `You're invited to ${eventTitle || 'a rally'}! 🎉`;
      notifBody = `${invitedBy || 'Someone'} invited you to join. Tap to RSVP.`;
    }

    // ========== AUTHORIZATION ==========
    // Verify caller has permission to send notifications
    if (eventId) {
      // Check if caller is the event creator or a cohost
      const { data: event } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      const isCreator = event?.creator_id === callerProfileId;

      const { data: cohost } = await supabase
        .from('event_cohosts')
        .select('id')
        .eq('event_id', eventId)
        .eq('profile_id', callerProfileId)
        .single();

      const isCohost = !!cohost;

      // Check if caller is an attendee
      const { data: attendee } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('profile_id', callerProfileId)
        .single();

      const isAttendee = !!attendee;

      if (!isCreator && !isCohost && !isAttendee) {
        console.error('Caller is not authorized for this event:', callerProfileId);
        return new Response(
          JSON.stringify({ error: 'You must be an event creator, cohost, or attendee to send notifications' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Authorized: user ${callerProfileId} (creator: ${isCreator}, cohost: ${isCohost}, attendee: ${isAttendee})`);
    } else if (targetProfileIds && targetProfileIds.length > 0) {
      // For direct notifications without an event, verify caller is connected to recipients
      // Check connection through shared events or squads
      const { data: sharedEvents } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', callerProfileId);

      const callerEventIds = sharedEvents?.map(e => e.event_id) || [];

      const { data: sharedSquads } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('profile_id', callerProfileId);

      const callerSquadIds = sharedSquads?.map(s => s.squad_id) || [];

      // Verify each target is connected to caller
      for (const targetId of targetProfileIds) {
        if (targetId === callerProfileId) continue; // Self is always allowed

        // Check shared events
        const { data: targetInEvent } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('profile_id', targetId)
          .in('event_id', callerEventIds.length > 0 ? callerEventIds : ['00000000-0000-0000-0000-000000000000'])
          .limit(1);

        // Check shared squads
        const { data: targetInSquad } = await supabase
          .from('squad_members')
          .select('id')
          .eq('profile_id', targetId)
          .in('squad_id', callerSquadIds.length > 0 ? callerSquadIds : ['00000000-0000-0000-0000-000000000000'])
          .limit(1);

        if ((!targetInEvent || targetInEvent.length === 0) && (!targetInSquad || targetInSquad.length === 0)) {
          console.error(`Caller ${callerProfileId} not connected to target ${targetId}`);
          return new Response(
            JSON.stringify({ error: 'You can only send notifications to users you are connected with' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log(`Authorized: user ${callerProfileId} connected to all ${targetProfileIds.length} targets`);
    } else {
      // No event or targets specified - reject
      return new Response(
        JSON.stringify({ error: 'Must specify either eventId or targetProfileIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== DETERMINE RECIPIENTS ==========
    let recipientProfileIds: string[] = [];

    if (payloadProfileIds && payloadProfileIds.length > 0) {
      // For rally_invite, use the profileIds from payload
      recipientProfileIds = payloadProfileIds;
    } else if (targetProfileIds && targetProfileIds.length > 0) {
      recipientProfileIds = targetProfileIds;
    } else if (eventId) {
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .eq('event_id', eventId);
      
      recipientProfileIds = attendees?.map(a => a.profile_id) || [];
    }

    // Exclude the sender if specified
    if (excludeProfileId) {
      recipientProfileIds = recipientProfileIds.filter((id: string) => id !== excludeProfileId);
    }

    if (recipientProfileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== CHECK NOTIFICATION PREFERENCES ==========
    const preferenceMap: Record<string, string> = {
      'bar_hop_transition': 'bar_hop_transitions',
      'ride_offer': 'ride_offers',
      'ride_request': 'ride_requests',
      'ride_response': 'ride_offers',
      'going_home': 'going_home_alerts',
      'arrived_safe': 'arrival_confirmations',
      'event_update': 'event_updates',
      'rally_invite': 'squad_invites',
    };

    const preferenceColumn = preferenceMap[type] || 'event_updates';

    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('profile_id', recipientProfileIds);

    const prefsMap = new Map((preferences || []).map((p: Record<string, unknown>) => [p.profile_id, p[preferenceColumn]]));
    const eligibleProfileIds = recipientProfileIds.filter((id: string) => {
      const pref = prefsMap.get(id);
      return pref === undefined || pref === true;
    });

    if (eligibleProfileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All users opted out' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== GET PUSH SUBSCRIPTIONS ==========
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('profile_id', eligibleProfileIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No push subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== SEND PUSH NOTIFICATIONS ==========
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Sending notifications to ${subscriptions.length} subscriptions for ${eligibleProfileIds.length} users`);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushPayload = JSON.stringify({
          title: notifTitle,
          body: notifBody,
          icon: '/rally-icon-192.png',
          badge: '/rally-icon-192.png',
          data: {
            ...data,
            type,
            eventId,
            url: type === 'rally_invite' ? '/notifications' : (eventId ? `/events/${eventId}` : '/'),
          },
        });

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: pushPayload,
        });

        if (!response.ok && response.status === 410) {
          // Subscription expired, remove it
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }

        return response;
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    console.log(`Successfully sent ${successCount}/${subscriptions.length} notifications by user ${callerProfileId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending push notifications:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
