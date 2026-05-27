// Share URL helpers. All outbound R@lly / Tab share links route through the
// crawler-aware `share-preview` edge function so iMessage/Slack/etc. fetch
// per-event OG metadata before a human is 302'd to the SPA.
import { PUBLIC_APP_URL } from '@/lib/appUrl';

function previewBase(): string {
  const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (!SUPABASE_PROJECT_ID) return PUBLIC_APP_URL;
  return `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/share-preview`;
}

export interface ShareLinkOptions {
  referrerId?: string | null;
}

/** Public R@lly invite link (uses invite code if available, falls back to event id). */
export function buildRallyShareUrl(
  params: { eventId: string; inviteCode?: string | null },
  opts: ShareLinkOptions = {},
): string {
  const target = params.inviteCode
    ? `${PUBLIC_APP_URL}/join/${params.inviteCode}`
    : `${PUBLIC_APP_URL}/events/${params.eventId}`;
  const sp = new URLSearchParams({ to: target, type: 'event', id: params.eventId });
  if (opts.referrerId) sp.set('r', opts.referrerId);
  return `${previewBase()}?${sp.toString()}`;
}

/** Clean human-readable share URL for direct sending via native share sheet or SMS.
 *  Uses rlly.cloud directly — the share-preview function will 302 browsers to
 *  this URL anyway, so no OG preview is lost. */
export function buildRallyShareUrlClean(
  params: { eventId: string; inviteCode?: string | null },
  opts: ShareLinkOptions = {},
): string {
  const base = params.inviteCode
    ? `${PUBLIC_APP_URL}/join/${params.inviteCode}`
    : `${PUBLIC_APP_URL}/events/${params.eventId}`;
  const sp = new URLSearchParams();
  if (opts.referrerId) sp.set('r', opts.referrerId);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Public standalone Tab share link. */
export function buildTabShareUrl(
  params: { requestId: string; payToken?: string | null },
): string {
  const target = params.payToken
    ? `${PUBLIC_APP_URL}/tab/pay/${params.payToken}`
    : `${PUBLIC_APP_URL}/tabs/${params.requestId}`;
  const sp = new URLSearchParams({ to: target, type: 'tab', id: params.requestId });
  return `${previewBase()}?${sp.toString()}`;
}

/** Direct PNG OG image URL (used by Helmet / meta tags). */
export function buildOgImageUrl(
  params: { eventId?: string; requestId?: string; inviteCode?: string },
): string {
  const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (!SUPABASE_PROJECT_ID) return `${PUBLIC_APP_URL}/og-fallback.png`;
  const sp = new URLSearchParams();
  if (params.eventId) sp.set('id', params.eventId);
  if (params.requestId) sp.set('tab', params.requestId);
  if (params.inviteCode) sp.set('code', params.inviteCode);
  return `https://${SUPABASE_PROJECT_ID}.functions.supabase.co/render-event-og-image?${sp.toString()}`;
}
