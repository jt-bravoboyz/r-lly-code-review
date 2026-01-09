import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  driverProfileIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

// Base64 URL encoding helper
function base64UrlEncode(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create JWT for VAPID authentication
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

// Send web push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, unknown>; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // For now, we'll use a simpler approach - call the push endpoint directly
    // with the encrypted payload using the Web Push protocol
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      tag: payload.tag || 'rally-notification'
    });

    // Create VAPID authorization header
    const jwt = await createVapidJwt(audience, 'mailto:support@rallyapp.com', vapidPrivateKey);
    const vapidHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Send the push (note: in production, you'd encrypt the payload properly)
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: new TextEncoder().encode(pushPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Push failed:', response.status, errorText);
      return false;
    }

    console.log('Push notification sent to:', subscription.endpoint.substring(0, 50) + '...');
    return true;
  } catch (error: any) {
    console.error('Failed to send push notification:', error.message);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // ============================================
    // SECURITY: Verify user authentication
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse and validate the payload
    const payload: PushPayload = await req.json();

    // Input validation
    if (!Array.isArray(payload.driverProfileIds) || payload.driverProfileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid driverProfileIds: must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.driverProfileIds.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Too many recipients: maximum 100 allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.title || typeof payload.title !== 'string' || payload.title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid title: must be a string up to 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.body || typeof payload.body !== 'string' || payload.body.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid body: must be a string up to 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the caller's profile
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Profile not found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // SECURITY: Verify caller has relationship with recipients
    // Only allow sending to users the caller is connected to via:
    // - Same event (both are attendees)
    // - Same squad (both are members)
    // - Caller is the event creator/cohost
    // ============================================
    let allowedProfileIds: string[] = [];
    console.log('Checking user connections for profile:', callerProfile.id);

    // Get profiles connected through events
    const { data: eventConnections } = await supabase
      .from('event_attendees')
      .select('profile_id, event_id')
      .eq('profile_id', callerProfile.id);

    if (eventConnections && eventConnections.length > 0) {
      const eventIds = eventConnections.map(e => e.event_id);
      const { data: eventProfiles } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .in('event_id', eventIds);
      
      if (eventProfiles) {
        allowedProfileIds.push(...eventProfiles.map(p => p.profile_id));
      }
    }

    // Get profiles connected through squads
    const { data: squadConnections } = await supabase
      .from('squad_members')
      .select('profile_id, squad_id')
      .eq('profile_id', callerProfile.id);

    if (squadConnections && squadConnections.length > 0) {
      const squadIds = squadConnections.map(s => s.squad_id);
      const { data: squadProfiles } = await supabase
        .from('squad_members')
        .select('profile_id')
        .in('squad_id', squadIds);
      
      if (squadProfiles) {
        allowedProfileIds.push(...squadProfiles.map(p => p.profile_id));
      }
    }

    // Check if caller is event creator - can notify all attendees
    const { data: createdEvents } = await supabase
      .from('events')
      .select('id')
      .eq('creator_id', callerProfile.id);

    if (createdEvents && createdEvents.length > 0) {
      const createdEventIds = createdEvents.map(e => e.id);
      const { data: eventAttendees } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .in('event_id', createdEventIds);
      
      if (eventAttendees) {
        allowedProfileIds.push(...eventAttendees.map(p => p.profile_id));
      }
    }

    // Remove duplicates
    allowedProfileIds = [...new Set(allowedProfileIds)];

    // Filter target profiles to only include those the caller can contact
    const authorizedTargets = payload.driverProfileIds.filter(
      id => allowedProfileIds.includes(id) || id === callerProfile.id
    );

    if (authorizedTargets.length === 0) {
      console.error('No authorized recipients found');
      return new Response(
        JSON.stringify({ error: 'You can only send notifications to users you are connected with' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authorized ${authorizedTargets.length}/${payload.driverProfileIds.length} recipients`);

    // Get push subscriptions for the authorized target profiles
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('profile_id', authorizedTargets);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for authorized recipients');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Send push to each subscription
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: payload.title, body: payload.body, data: payload.data, tag: payload.tag },
          vapidPublicKey,
          vapidPrivateKey
        )
      )
    );

    const successCount = results.filter(Boolean).length;
    console.log(`Sent ${successCount}/${subscriptions.length} push notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
