/**
 * rlly-share-unfurl
 *
 * Cloudflare Worker bound to:
 *   - rlly.cloud/join/*
 *   - rlly.cloud/events/*
 *
 * Behavior:
 *   - Bot user agents (Facebook, Twitter, Slack, iMessage, etc.) are
 *     proxied to the Supabase `share-preview` edge function, which returns
 *     full og:* + twitter:* meta pointing at the themed flyer.
 *   - All other (human) traffic is passed through to origin so the SPA
 *     loads normally.
 */

const SHARE_PREVIEW_URL =
  'https://lovzfxppnxictkvymyot.functions.supabase.co/share-preview';

const BOT_UA_PATTERN =
  /facebookexternalhit|facebookcatalog|twitterbot|slackbot|linkedinbot|discordbot|telegrambot|whatsapp|snapchat|instagram|pinterest|applebot|redditbot|skypeuripreview|embedly|quora|bingbot|googlebot|baiduspider|yandex|ia_archiver/i;

function isBot(req: Request): boolean {
  const ua = req.headers.get('user-agent') ?? '';
  return BOT_UA_PATTERN.test(ua);
}

function matchedRoute(pathname: string): { seg: 'join' | 'events'; value: string } | null {
  const m = pathname.match(/^\/(join|events)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return { seg: m[1] as 'join' | 'events', value: m[2] };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = matchedRoute(url.pathname);

    // Not a share route, or not a bot — pass through to origin.
    if (!route || !isBot(request)) {
      return fetch(request);
    }

    const to = `https://rlly.cloud${url.pathname}${url.search}`;
    const params = new URLSearchParams();
    params.set('to', to);
    params.set('type', 'event');
    if (route.seg === 'join') params.set('code', route.value);
    else params.set('id', route.value);

    const upstream = `${SHARE_PREVIEW_URL}?${params.toString()}`;

    try {
      const res = await fetch(upstream, {
        headers: {
          'user-agent': request.headers.get('user-agent') ?? 'rlly-share-unfurl',
          accept: 'text/html',
        },
        // Prevent infinite redirect loops back to rlly.cloud.
        redirect: 'manual',
      });

      // Re-emit as a clean text/html response so social scrapers see meta.
      const body = await res.text();
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=300',
          'x-rlly-unfurl': 'worker',
        },
      });
    } catch (err) {
      // On failure, fall back to origin rather than break the bot.
      return fetch(request);
    }
  },
};
