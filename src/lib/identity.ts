/**
 * Identity helpers for the dual-name system (full_name + nickname).
 *
 * - PUBLIC name (Feed, Squads, Alerts, Chat, Notifications): nickname → full_name → display_name → fallback
 * - PRIVATE name (Admin, R@lly Home / Safety / DD coordination): full_name → display_name → fallback
 *
 * The DB trigger keeps `display_name = COALESCE(nickname, full_name)`, so legacy
 * components that still read `display_name` automatically get the public name.
 * Use these helpers when you need to *explicitly* request the public or private name.
 */
export type IdentityProfile = {
  full_name?: string | null;
  nickname?: string | null;
  display_name?: string | null;
};

const FALLBACK = 'R@lly Member';

const clean = (v?: string | null) => (v ?? '').trim();

export function getPublicName(p?: IdentityProfile | null): string {
  if (!p) return FALLBACK;
  return clean(p.nickname) || clean(p.full_name) || clean(p.display_name) || FALLBACK;
}

export function getPrivateName(p?: IdentityProfile | null): string {
  if (!p) return FALLBACK;
  return clean(p.full_name) || clean(p.display_name) || FALLBACK;
}

/** True when this profile has a distinct public handle different from their real name. */
export function hasNickname(p?: IdentityProfile | null): boolean {
  return !!clean(p?.nickname);
}
