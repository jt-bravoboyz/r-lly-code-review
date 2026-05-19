// Crawler-aware router. Bots get minimal HTML with full og:* + twitter:* meta tags
// pointing at our render-event-og-image endpoint. Humans 302 to the SPA target.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_REGEX = /facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|WhatsApp|iMessage|Discordbot|TelegramBot|Pinterest|bingbot|Googlebot|Applebot|redditbot|Mastodon|SkypeUriPreview|vkShare|W3C_Validator|embedly|quora|outbrain/i;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const to = url.searchParams.get('to');
  const type = url.searchParams.get('type'); // 'event' | 'tab'
  const id = url.searchParams.get('id');
  if (!to) return new Response('Missing `to`', { status: 400, headers: corsHeaders });

  const ua = req.headers.get('user-agent') ?? '';
  const isBot = BOT_REGEX.test(ua);

  if (!isBot) {
    return Response.redirect(to, 302);
  }

  // Build meta-only HTML for crawlers.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const projectId = (supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1]) ?? '';
  const ogParam = type === 'tab' ? `tab=${id}` : `id=${id}`;
  const ogImage = `https://${projectId}.functions.supabase.co/render-event-og-image?${ogParam}`;

  let title = "You're invited — R@lly";
  let description = 'Nights That Matter. Tap to RSVP.';

  try {
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    if (type === 'event' && id) {
      const { data } = await supabase.from('events').select('title,description,start_time,location_name').eq('id', id).maybeSingle();
      if (data) {
        title = `${data.title} — R@lly`;
        const when = data.start_time ? new Date(data.start_time).toUTCString().slice(0, 22) : '';
        const where = data.location_name ? ` · ${data.location_name}` : '';
        description = data.description ?? `${when}${where} · Tap to RSVP`;
      }
    } else if (type === 'tab' && id) {
      const { data } = await supabase.from('split_check_requests').select('title,total_cents').eq('id', id).maybeSingle();
      if (data) {
        title = `${data.title ?? 'Split a tab'} — R@lly`;
        description = `$${((data.total_cents ?? 0) / 100).toFixed(2)} · Split this tab with friends`;
      }
    }
  } catch (e) {
    console.error('[share-preview] lookup failed', e);
  }

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(to)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="R@lly" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(to)}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${ogImage}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(to)}" />
</head><body><p>Redirecting to <a href="${escapeHtml(to)}">${escapeHtml(to)}</a>…</p></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
});
