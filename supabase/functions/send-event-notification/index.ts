import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  type: 'bar_hop_transition' | 'ride_offer' | 'ride_request' | 'ride_response' | 'going_home' | 'arrived_safe' | 'event_update';
  eventId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  targetProfileIds?: string[];
  excludeProfileId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: PushPayload = await req.json();
    const { type, eventId, title, body, data, targetProfileIds, excludeProfileId } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which users should receive the notification
    let profileIds: string[] = [];

    if (targetProfileIds && targetProfileIds.length > 0) {
      profileIds = targetProfileIds;
    } else if (eventId) {
      // Get all attendees of the event
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .eq('event_id', eventId);
      
      profileIds = attendees?.map(a => a.profile_id) || [];
    }

    // Exclude the sender if specified
    if (excludeProfileId) {
      profileIds = profileIds.filter(id => id !== excludeProfileId);
    }

    if (profileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map notification type to preference column
    const preferenceMap: Record<string, string> = {
      'bar_hop_transition': 'bar_hop_transitions',
      'ride_offer': 'ride_offers',
      'ride_request': 'ride_requests',
      'ride_response': 'ride_offers',
      'going_home': 'going_home_alerts',
      'arrived_safe': 'arrival_confirmations',
      'event_update': 'event_updates',
    };

    const preferenceColumn = preferenceMap[type] || 'event_updates';

    // Get notification preferences for users
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('profile_id', profileIds);

    // Filter to only users who want this type of notification
    const prefsMap = new Map((preferences || []).map((p: any) => [p.profile_id, p[preferenceColumn]]));
    const eligibleProfileIds = profileIds.filter(id => {
      const pref = prefsMap.get(id);
      return pref === undefined || pref === true;
    });

    if (eligibleProfileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All users opted out' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get push subscriptions for eligible users
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

    // Send push notifications
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushPayload = JSON.stringify({
          title,
          body,
          icon: '/rally-icon-192.png',
          badge: '/rally-icon-192.png',
          data: {
            ...data,
            type,
            eventId,
            url: eventId ? `/events/${eventId}` : '/',
          },
        });

        // Use web-push compatible format
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
