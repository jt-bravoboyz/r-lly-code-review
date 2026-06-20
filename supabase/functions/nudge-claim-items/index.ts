import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id ?? '');
    if (!requestId) return json({ error: 'request_id required' }, 400);

    // Caller profile
    const { data: callerProfile } = await admin
      .from('profiles').select('id, display_name')
      .eq('user_id', userData.user.id).maybeSingle();
    if (!callerProfile) return json({ error: 'profile not found' }, 404);

    // Tab request
    const { data: reqRow } = await admin
      .from('split_check_requests')
      .select('id, host_id, event_id')
      .eq('id', requestId).maybeSingle();
    if (!reqRow) return json({ error: 'request not found' }, 404);

    // Authorization: caller must be host or a target
    const { data: callerTarget } = await admin
      .from('split_check_targets')
      .select('id').eq('request_id', requestId).eq('profile_id', callerProfile.id).maybeSingle();
    if (reqRow.host_id !== callerProfile.id && !callerTarget) {
      return json({ error: 'forbidden' }, 403);
    }

    // Rate limit (1 per 10 min per caller)
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_profile_id: callerProfile.id,
      p_action_type: 'tab_claim_nudge',
      p_max_count: 1,
      p_window_minutes: 10,
    });
    if (allowed === false) return json({ ok: true, skipped: 'rate_limited' });

    // All participants (host + non-canceled targets)
    const { data: targets } = await admin
      .from('split_check_targets')
      .select('profile_id, status').eq('request_id', requestId);
    const participantIds = new Set<string>();
    if (reqRow.host_id) participantIds.add(reqRow.host_id);
    (targets ?? []).forEach((t: any) => {
      if (t.status !== 'canceled' && t.profile_id) participantIds.add(t.profile_id);
    });
    participantIds.delete(callerProfile.id);

    if (participantIds.size === 0) return json({ ok: true, notified: 0 });

    // Items + claimers — skip anyone who already claimed
    const { data: items } = await admin
      .from('split_check_items').select('id').eq('request_id', requestId);
    const itemIds = (items ?? []).map((i: any) => i.id);
    let claimedSet = new Set<string>();
    if (itemIds.length) {
      const { data: claims } = await admin
        .from('split_check_item_claims').select('profile_id').in('item_id', itemIds);
      claimedSet = new Set((claims ?? []).map((c: any) => c.profile_id));
    }

    const recipients = Array.from(participantIds).filter(pid => !claimedSet.has(pid));
    if (recipients.length === 0) return json({ ok: true, notified: 0 });

    const callerName = callerProfile.display_name ?? 'Someone';
    const title = `${callerName} submitted their items`;
    const bodyText = 'Claim what you ordered so the tab can settle.';

    const rows = recipients.map(pid => ({
      profile_id: pid,
      type: 'tab_claim_nudge',
      title,
      body: bodyText,
      data: { request_id: requestId, event_id: reqRow.event_id ?? null },
      read: false,
    }));
    await admin.from('notifications').insert(rows);

    await admin.rpc('record_rate_limit', {
      p_profile_id: callerProfile.id,
      p_action_type: 'tab_claim_nudge',
    });

    // Best-effort push
    for (const pid of recipients) {
      admin.functions.invoke('send-push-notification', {
        body: { profile_id: pid, title, body: bodyText, data: { request_id: requestId } },
      }).catch(() => {});
    }

    return json({ ok: true, notified: recipients.length });
  } catch (e) {
    console.error('nudge-claim-items error', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
