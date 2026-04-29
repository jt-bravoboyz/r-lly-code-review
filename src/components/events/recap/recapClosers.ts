export interface RecapCloser {
  title: string;
  subtitle: string;
  share: string;
  emoji: string;
}

export const RECAP_CLOSERS: RecapCloser[] = [
  { title: 'Mission Accomplished.', subtitle: 'The horse is back in the stable.', share: '100% SECURED. The horse is back in the stable.', emoji: '🐴' },
  { title: 'Vibe Shift Completed.', subtitle: 'We set the new standard.', share: 'Vibe Shift Completed. We set the new standard.', emoji: '🌊' },
  { title: 'Receipts Filed.', subtitle: 'Legends only, no skips.', share: 'Receipts Filed. Legends only, no skips.', emoji: '🧾' },
  { title: 'Signal Lost.', subtitle: 'Into the archives we go.', share: 'Signal Lost. Into the archives we go.', emoji: '📡' },
  { title: 'Final Frame.', subtitle: 'The reel of the year just dropped.', share: 'Final Frame. The reel of the year just dropped.', emoji: '🎞️' },
  { title: 'Touchdown Confirmed.', subtitle: 'Home and highly favored.', share: 'Touchdown Confirmed. Home and highly favored.', emoji: '🏁' },
  { title: 'Crew Secured.', subtitle: 'Everyone made the cut.', share: 'Crew Secured. Everyone made the cut.', emoji: '🛟' },
  { title: 'Wheels Down.', subtitle: 'Story logged. Squad accounted for.', share: 'Wheels Down. Story logged, squad accounted for.', emoji: '✈️' },
  { title: 'Sun-Up Survivors.', subtitle: 'Last call, first light, no casualties.', share: 'Sun-Up Survivors. No casualties.', emoji: '🌅' },
  { title: 'Curtain Call.', subtitle: 'Encore was unreasonable.', share: 'Curtain Call. The encore was unreasonable.', emoji: '🎭' },
  { title: 'Stamped & Sealed.', subtitle: 'One for the highlight reel.', share: 'Stamped & Sealed. One for the highlight reel.', emoji: '📮' },
  { title: 'Plot Locked.', subtitle: 'That arc was undefeated.', share: 'Plot Locked. That arc was undefeated.', emoji: '📖' },
];

/** Stable per-event closer so it doesn't flicker on re-renders. */
export function getRecapCloser(eventId: string): RecapCloser {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % RECAP_CLOSERS.length;
  return RECAP_CLOSERS[idx];
}
