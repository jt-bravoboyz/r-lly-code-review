import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArrivalNotificationRequest {
  type: 'arrival' | 'departure';
  profileId: string;
  venueId: string;
  eventId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, profileId, venueId, eventId } = await req.json() as ArrivalNotificationRequest;

    console.log(`Processing ${type} notification for profile ${profileId} at venue ${venueId}`);

    // Get the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', profileId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    // Get the venue info
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('name, address')
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.error('Error fetching venue:', venueError);
      throw venueError;
    }

    // Find friends to notify - users in the same event or squad
    let friendIds: string[] = [];

    if (eventId) {
      // Get all attendees of the same event
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .eq('event_id', eventId)
        .neq('profile_id', profileId);

      if (attendees) {
        friendIds = attendees.map(a => a.profile_id);
      }
    }

    // Also get squad members
    const { data: squads } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('profile_id', profileId);

    if (squads && squads.length > 0) {
      const squadIds = squads.map(s => s.squad_id);
      
      const { data: squadMembers } = await supabase
        .from('squad_members')
        .select('profile_id')
        .in('squad_id', squadIds)
        .neq('profile_id', profileId);

      if (squadMembers) {
        const squadMemberIds = squadMembers.map(m => m.profile_id);
        friendIds = [...new Set([...friendIds, ...squadMemberIds])];
      }
    }

    if (friendIds.length === 0) {
      console.log('No friends to notify');
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check each friend's notification settings
    const { data: settings } = await supabase
      .from('arrival_notification_settings')
      .select('*')
      .in('profile_id', friendIds);

    // Filter friends based on their settings
    const friendsToNotify = friendIds.filter(friendId => {
      const friendSettings = settings?.find(s => s.profile_id === friendId);
      
      // Default to true if no settings exist
      if (!friendSettings) return true;
      
      if (type === 'arrival' && !friendSettings.notify_on_friend_arrival) return false;
      if (type === 'departure' && !friendSettings.notify_on_friend_departure) return false;
      
      // If they only want same-event notifications and there's no shared event
      if (friendSettings.notify_only_same_event && !eventId) {
        // Check if they're at the same venue
        // For now, we'll still notify if they're squad members
        return true;
      }
      
      return true;
    });

    console.log(`Notifying ${friendsToNotify.length} friends`);

    // Create notifications for each friend
    const title = type === 'arrival'
      ? `${userProfile.display_name} just arrived! 🎉`
      : `${userProfile.display_name} left the venue`;
    
    const body = type === 'arrival'
      ? `Your friend just got to ${venue.name}`
      : `Your friend left ${venue.name}`;

    const notifications = friendsToNotify.map(friendId => ({
      profile_id: friendId,
      type: `friend_${type}`,
      title,
      body,
      data: {
        profileId,
        venueId,
        venueName: venue.name,
        eventId,
        timestamp: new Date().toISOString(),
      },
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    // Send push notifications
    const { data: pushSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('profile_id', friendsToNotify);

    if (pushSubscriptions && pushSubscriptions.length > 0) {
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

      if (vapidPrivateKey && vapidPublicKey) {
        // Import web-push compatible library for Deno
        // Note: In production, you'd use a proper web-push implementation
        for (const subscription of pushSubscriptions) {
          try {
            // For now, we've created the in-app notification
            // Push notification would be sent here with web-push
            console.log(`Would send push to ${subscription.profile_id}`);
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: friendsToNotify.length,
        type,
        venueName: venue.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-arrival-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
