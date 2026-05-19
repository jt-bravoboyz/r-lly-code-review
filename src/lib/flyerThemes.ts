// R@lly Themed Flyer Engine — 9-theme registry + Satori-safe title fitter.
// Backgrounds are pre-baked transparent-friendly JPEGs in src/assets/flyer-themes/.

import rallyDynamicBg from '@/assets/flyer-themes/rally-dynamic-bg.jpg';
import tequilaSunsetBg from '@/assets/flyer-themes/tequila-sunset-bg.jpg';
import midnightDiscoBg from '@/assets/flyer-themes/midnight-disco-bg.jpg';
import gardenPartyBg from '@/assets/flyer-themes/garden-party-bg.jpg';
import neonWarehouseBg from '@/assets/flyer-themes/neon-warehouse-bg.jpg';
import sundayBrunchBg from '@/assets/flyer-themes/sunday-brunch-bg.jpg';
import goldenHourBg from '@/assets/flyer-themes/golden-hour-bg.jpg';
import gameDayBg from '@/assets/flyer-themes/game-day-bg.jpg';
import beachClubBg from '@/assets/flyer-themes/beach-club-bg.jpg';

export type FlyerThemeKey =
  | 'rally_dynamic'
  | 'tequila_sunset'
  | 'midnight_disco'
  | 'garden_party'
  | 'neon_warehouse'
  | 'sunday_brunch'
  | 'golden_hour'
  | 'game_day'
  | 'beach_club';

export interface FlyerTheme {
  key: FlyerThemeKey;
  label: string;
  vibe: string;
  bg: string;
  /** Public asset path served from /assets — used by the edge function. */
  bgPublicPath: string;
  /** Frosted arch tint (rgba). */
  archTint: string;
  /** Title gradient (CSS linear-gradient, Satori-safe). */
  titleGradient: string;
  /** Solid title color fallback (Satori needs a color even with gradient). */
  titleColor: string;
  /** Meta/body text color. */
  metaColor: string;
  /** Dress-code accent swatches. */
  palette: [string, string, string, string];
  /** Frame glow (used in 3:4 preview). */
  frameGlow: string;
  headingFont: string;
}

export const FLYER_THEMES: Record<FlyerThemeKey, FlyerTheme> = {
  rally_dynamic: {
    key: 'rally_dynamic',
    label: 'R@lly Signature',
    vibe: 'Liquid metallic · R@lly Orange glow',
    bg: rallyDynamicBg,
    bgPublicPath: '/flyer-themes/rally-dynamic-bg.jpg',
    archTint: 'rgba(20, 14, 10, 0.42)',
    titleGradient: 'linear-gradient(135deg, #FFE9D2 0%, #F47A19 55%, #FFB178 100%)',
    titleColor: '#F47A19',
    metaColor: '#FFE9D2',
    palette: ['#F47A19', '#1A1108', '#FFD9B0', '#FFFFFF'],
    frameGlow: '0 0 80px rgba(244,122,25,0.45)',
    headingFont: 'Playfair Display',
  },
  tequila_sunset: {
    key: 'tequila_sunset',
    label: 'Tequila Sunset',
    vibe: 'Warm amber · hibiscus + agave',
    bg: tequilaSunsetBg,
    bgPublicPath: '/flyer-themes/tequila-sunset-bg.jpg',
    archTint: 'rgba(48, 18, 12, 0.35)',
    titleGradient: 'linear-gradient(135deg, #FFE2C2 0%, #F58E5A 60%, #C8407A 100%)',
    titleColor: '#FFE2C2',
    metaColor: '#FFE7D1',
    palette: ['#F58E5A', '#C8407A', '#FFD08A', '#5B1A2A'],
    frameGlow: '0 0 80px rgba(200,64,122,0.4)',
    headingFont: 'Playfair Display',
  },
  midnight_disco: {
    key: 'midnight_disco',
    label: 'Midnight Disco',
    vibe: 'Deep purple · chrome · mirrorball',
    bg: midnightDiscoBg,
    bgPublicPath: '/flyer-themes/midnight-disco-bg.jpg',
    archTint: 'rgba(12, 6, 26, 0.5)',
    titleGradient: 'linear-gradient(135deg, #E9E2FF 0%, #B59BFF 50%, #5C3CFF 100%)',
    titleColor: '#E9E2FF',
    metaColor: '#D8CFFF',
    palette: ['#5C3CFF', '#B59BFF', '#E5E5F0', '#0C0620'],
    frameGlow: '0 0 90px rgba(92,60,255,0.5)',
    headingFont: 'Playfair Display',
  },
  garden_party: {
    key: 'garden_party',
    label: 'Garden Party',
    vibe: 'Pastel florals · daylight linen',
    bg: gardenPartyBg,
    bgPublicPath: '/flyer-themes/garden-party-bg.jpg',
    archTint: 'rgba(255, 248, 240, 0.45)',
    titleGradient: 'linear-gradient(135deg, #3A2A1F 0%, #6B4A3A 100%)',
    titleColor: '#3A2A1F',
    metaColor: '#4A3326',
    palette: ['#F6C6B8', '#A8C49A', '#E8D7C3', '#3A2A1F'],
    frameGlow: '0 0 70px rgba(168,196,154,0.35)',
    headingFont: 'Playfair Display',
  },
  neon_warehouse: {
    key: 'neon_warehouse',
    label: 'Neon Warehouse',
    vibe: 'Industrial steel · neon spill',
    bg: neonWarehouseBg,
    bgPublicPath: '/flyer-themes/neon-warehouse-bg.jpg',
    archTint: 'rgba(8, 10, 14, 0.55)',
    titleGradient: 'linear-gradient(135deg, #F0F8FF 0%, #00F0FF 50%, #FF2E9A 100%)',
    titleColor: '#00F0FF',
    metaColor: '#E8F5FF',
    palette: ['#00F0FF', '#FF2E9A', '#1B1F26', '#F0F8FF'],
    frameGlow: '0 0 100px rgba(0,240,255,0.45)',
    headingFont: 'Playfair Display',
  },
  sunday_brunch: {
    key: 'sunday_brunch',
    label: 'Sunday Brunch',
    vibe: 'Cream linen · soft sage',
    bg: sundayBrunchBg,
    bgPublicPath: '/flyer-themes/sunday-brunch-bg.jpg',
    archTint: 'rgba(255, 250, 240, 0.55)',
    titleGradient: 'linear-gradient(135deg, #2A2419 0%, #6B5840 100%)',
    titleColor: '#2A2419',
    metaColor: '#3D3221',
    palette: ['#E8DCC4', '#B5C9A8', '#F4E8D0', '#2A2419'],
    frameGlow: '0 0 60px rgba(181,201,168,0.3)',
    headingFont: 'Playfair Display',
  },
  golden_hour: {
    key: 'golden_hour',
    label: 'Golden Hour',
    vibe: 'Amber lens flare · rooftop glow',
    bg: goldenHourBg,
    bgPublicPath: '/flyer-themes/golden-hour-bg.jpg',
    archTint: 'rgba(60, 30, 10, 0.35)',
    titleGradient: 'linear-gradient(135deg, #FFF1C9 0%, #FFB04A 60%, #B05E1A 100%)',
    titleColor: '#FFF1C9',
    metaColor: '#FFE7B8',
    palette: ['#FFB04A', '#B05E1A', '#FFF1C9', '#3A1F0A'],
    frameGlow: '0 0 90px rgba(255,176,74,0.45)',
    headingFont: 'Playfair Display',
  },
  game_day: {
    key: 'game_day',
    label: 'Game Day',
    vibe: 'Stadium flare · varsity split',
    bg: gameDayBg,
    bgPublicPath: '/flyer-themes/game-day-bg.jpg',
    archTint: 'rgba(8, 14, 32, 0.55)',
    titleGradient: 'linear-gradient(135deg, #FFFFFF 0%, #FFD24A 100%)',
    titleColor: '#FFFFFF',
    metaColor: '#F0F4FF',
    palette: ['#0E1F4D', '#1F6B3A', '#FFD24A', '#FFFFFF'],
    frameGlow: '0 0 80px rgba(255,210,74,0.4)',
    headingFont: 'Playfair Display',
  },
  beach_club: {
    key: 'beach_club',
    label: 'Beach Club',
    vibe: 'Pool turquoise · ice-white linen',
    bg: beachClubBg,
    bgPublicPath: '/flyer-themes/beach-club-bg.jpg',
    archTint: 'rgba(220, 245, 250, 0.45)',
    titleGradient: 'linear-gradient(135deg, #0E5A6E 0%, #1FA8C4 100%)',
    titleColor: '#0E5A6E',
    metaColor: '#0B3A4A',
    palette: ['#5FE0E8', '#F4FBFD', '#1FA8C4', '#0E5A6E'],
    frameGlow: '0 0 80px rgba(95,224,232,0.45)',
    headingFont: 'Playfair Display',
  },
};

export const FLYER_THEME_KEYS = Object.keys(FLYER_THEMES) as FlyerThemeKey[];

export const DEFAULT_FLYER_THEME: FlyerThemeKey = 'rally_dynamic';

export function getFlyerTheme(key: string | null | undefined): FlyerTheme {
  if (key && key in FLYER_THEMES) return FLYER_THEMES[key as FlyerThemeKey];
  return FLYER_THEMES[DEFAULT_FLYER_THEME];
}

/**
 * Satori-safe title fitter.
 * Satori does not implement CSS `word-break` / `overflow-wrap` like browsers,
 * so we hard-split long titles into at most `maxLines` lines of `maxCharsPerLine`,
 * appending an ellipsis if truncated.
 */
export function fitFlyerTitle(
  raw: string,
  maxLines = 2,
  maxCharsPerLine = 22,
): string[] {
  const clean = (raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (lines.length === maxLines) break;
      // Hard-split words that are themselves too long.
      if (w.length > maxCharsPerLine) {
        current = w.substring(0, maxCharsPerLine - 1) + '…';
      } else {
        current = w;
      }
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    // Check if we truncated the source string.
    const reconstructed = lines.join(' ');
    if (reconstructed.length < clean.length) {
      const last = lines[maxLines - 1];
      const trimmed = last.length > maxCharsPerLine - 1
        ? last.substring(0, maxCharsPerLine - 1)
        : last;
      lines[maxLines - 1] = trimmed.replace(/[\s,.]+$/, '') + '…';
    }
  }
  return lines.length ? lines : [''];
}
