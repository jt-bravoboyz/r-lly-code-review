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

// Base64 URL encoding/decoding helpers
function base64UrlEncode(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// HMAC-SHA-256 helper
async function hmac256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// HKDF-Expand (single block, len ≤ 32) per RFC 5869
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  return (await hmac256(prk, concatBytes(info, new Uint8Array([1])))).slice(0, len);
}

/**
 * Encrypt a Web Push payload per RFC 8291 (aes128gcm content encoding).
 * Returns the full encrypted body including the RFC 8291 header.
 */
async function encryptWebPushPayload(
  p256dhB64: string,
  authB64: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const RS = 4096; // record size (standard)

  const receiverPub = base64UrlDecode(p256dhB64);
  const authSecret = base64UrlDecode(authB64);

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Ephemeral sender key pair (P-256)
  const senderKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const senderPub = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKeys.publicKey)
  ); // 65 bytes, uncompressed

  // ECDH shared secret
  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKeys.privateKey, 256)
  );

  // RFC 8291 §3.3 key agreement
  // PRK_key = HMAC-SHA-256(auth_secret, ecdh_secret)
  const prkKey = await hmac256(authSecret, ecdhSecret);

  // auth_info = "WebPush: info\x00" || receiver_pub (65 B) || sender_pub (65 B)
  const authInfo = concatBytes(
    new TextEncoder().encode('WebPush: info\x00'),
    receiverPub,
    senderPub,
  );

  // IKM = HKDF-Expand(PRK_key, auth_info, 32)
  const ikm = await hkdfExpand(prkKey, authInfo, 32);

  // PRK = HMAC-SHA-256(salt, IKM)
  const prk = await hmac256(salt, ikm);

  // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\x00", 16)
  const cek = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);

  // NONCE = HKDF-Expand(PRK, "Content-Encoding: nonce\x00", 12)
  const nonce = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12);

  // Pad plaintext: content || 0x02 delimiter || 0x00 padding to (RS - 16) bytes
  const paddedLen = RS - 16; // room for AES-GCM tag
  const padded = new Uint8Array(paddedLen);
  const copyLen = Math.min(plaintext.length, paddedLen - 1);
  padded.set(plaintext.slice(0, copyLen));
  padded[copyLen] = 0x02; // delimiter (no padding flag)

  // AES-128-GCM encrypt → RS bytes (content + 16-byte tag)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  // RFC 8291 §2 header: salt (16) || rs (4 BE) || idlen (1=65) || sender_pub (65)
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, RS, false);

  return concatBytes(salt, rsBytes, new Uint8Array([65]), senderPub, encrypted);
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

// Send web push notification with proper RFC 8291 payload encryption
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, unknown>; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const plaintext = new TextEncoder().encode(JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      tag: payload.tag ?? 'rally-notification',
    }));

    // Encrypt payload per RFC 8291 (aes128gcm)
    const encrypted = await encryptWebPushPayload(subscription.p256dh, subscription.auth, plaintext);

    // VAPID authorization
    const jwt = await createVapidJwt(audience, 'mailto:support@rallyapp.com', vapidPrivateKey);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: encrypted,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Web push failed:', response.status, errorText);
      return false;
    }

    console.log('Web push sent to:', subscription.endpoint.substring(0, 50) + '...');
    return true;
  } catch (error: any) {
    console.error('Failed to send web push:', error.message);
    return false;
  }
}

// =========================
// APNs (Apple Push) delivery
// =========================

let cachedApnsJwt: { token: string; iat: number } | null = null;

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getApnsJwt(keyId: string, teamId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && now - cachedApnsJwt.iat < 50 * 60) {
    return cachedApnsJwt.token;
  }
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: teamId, iat: now };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const keyBytes = pemToPkcs8Bytes(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const token = `${unsigned}.${base64UrlEncode(signature)}`;
  cachedApnsJwt = { token, iat: now };
  return token;
}

async function sendApnsNotification(
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, unknown>; tag?: string }
): Promise<boolean> {
  try {
    const keyId = Deno.env.get('APNS_KEY_ID');
    const teamId = Deno.env.get('APNS_TEAM_ID');
    const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
    const topic = Deno.env.get('APNS_TOPIC') ?? 'com.bravoboyz.rally';

    if (!keyId || !teamId || !privateKey) {
      console.warn('APNs not configured (missing APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY) — skipping native push');
      return false;
    }

    const jwt = await getApnsJwt(keyId, teamId, privateKey);

    const body = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: 'default',
        badge: 1,
      },
      data: payload.data ?? {},
    });

    const response = await fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('APNs send failed:', response.status, text);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('APNs send error:', err?.message ?? err);
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

    // Allow friend requests and accepted friends
    const { data: friendConnections } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${callerProfile.id},recipient_id.eq.${callerProfile.id}`)
      .in('status', ['pending', 'accepted']);

    if (friendConnections) {
      for (const friendship of friendConnections) {
        const otherProfileId = friendship.requester_id === callerProfile.id ? friendship.recipient_id : friendship.requester_id;
        const isOutgoingPending = friendship.status === 'pending' && friendship.requester_id === callerProfile.id;
        if (friendship.status === 'accepted' || isOutgoingPending) {
          allowedProfileIds.push(otherProfileId);
        }
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

    // Send push to each subscription — route by endpoint prefix
    const pushPayload = { title: payload.title, body: payload.body, data: payload.data, tag: payload.tag };
    const results = await Promise.all(
      subscriptions.map((sub) => {
        const endpoint: string = sub.endpoint ?? '';
        if (endpoint.startsWith('capacitor:') && endpoint.includes('realtime')) {
          // Realtime fallback — Supabase realtime delivers in-app; no push needed
          return Promise.resolve(true);
        }
        if (endpoint.startsWith('capacitor:ios:')) {
          const token = endpoint.slice('capacitor:ios:'.length);
          return sendApnsNotification(token, pushPayload);
        }
        if (endpoint.startsWith('capacitor:android:')) {
          // FCM not wired yet
          return Promise.resolve(false);
        }
        return sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
      })
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
