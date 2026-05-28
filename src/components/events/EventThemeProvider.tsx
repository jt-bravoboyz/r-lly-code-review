import { ReactNode, useMemo } from 'react';
import { getFlyerTheme, getFlyerButtonAccent, type FlyerThemeKey } from '@/lib/flyerThemes';


interface EventThemeProviderProps {
  themeKey: string | null | undefined;
  /** When true, suppresses the themed backdrop (e.g. during After R@lly purple mode). */
  disabled?: boolean;
  children: ReactNode;
}

/** Parse "rgba(r,g,b,a)" or "rgb(r,g,b)" — returns null if it can't. */
function parseRgba(input: string): { r: number; g: number; b: number; a: number } | null {
  const m = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
}

/** Parse "#rgb", "#rrggbb", or "#rrggbbaa" into {r,g,b}. Returns null on failure. */
function hexToRgb(input: string): { r: number; g: number; b: number } | null {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');
  // Expand 3-digit shorthand (#f00 → #ff0000) and 4-digit (#f00a → #ff0000aa)
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6 && h.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

/** Build the accent-soft token. Falls back to a neutral ink-tinted glass if parse fails. */
function buildAccentSoft(accentHex: string, fallbackInk: string): string {
  const rgb = hexToRgb(accentHex);
  if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
  return fallbackInk === '#FFF5E8'
    ? 'rgba(255, 245, 232, 0.14)'
    : 'rgba(26, 17, 8, 0.10)';
}

/** Relative luminance (0..1) for an sRGB color. */
function luminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}


/**
 * Wraps the Event Detail screen in the host's selected flyer theme.
 * Injects:
 *  - A fixed ambient backdrop (image + drifting color blobs + contrast scrim)
 *  - CSS custom properties so descendant components can opt into theme tokens
 *  - A "mode" class (`event-themed--light` | `event-themed--dark`) for contrast logic
 */
export function EventThemeProvider({ themeKey, disabled, children }: EventThemeProviderProps) {
  const theme = getFlyerTheme(themeKey as FlyerThemeKey | null | undefined);

  const { mode, ink, meta, glassTint, glassBorder } = useMemo(() => {
    const archRgba = parseRgba(theme.archTint);
    // Mode: light if the scrim itself is light (Garden Party / Brunch / Beach).
    let isLight = false;
    if (archRgba) {
      isLight = luminance(archRgba.r, archRgba.g, archRgba.b) > 0.6;
    }
    const ink = isLight ? '#1a1108' : '#FFF5E8';
    const meta = isLight ? 'rgba(26, 17, 8, 0.72)' : 'rgba(255, 245, 232, 0.78)';
    const glassTint = isLight
      ? 'rgba(255, 255, 255, 0.55)'
      : 'rgba(20, 14, 10, 0.42)';
    const glassBorder = isLight
      ? 'rgba(26, 17, 8, 0.10)'
      : 'rgba(255, 245, 232, 0.14)';
    return { mode: isLight ? 'light' : 'dark', ink, meta, glassTint, glassBorder };
  }, [theme]);

  if (disabled) {
    return <>{children}</>;
  }

  const [accent, accent2, accent3] = theme.palette;
  const accentSoft = buildAccentSoft(accent, ink);
  const inkStrong = mode === 'light' ? '#0B0F1A' : '#FFFFFF';

  const cssVars: React.CSSProperties = {
    // Theme tokens consumable by descendants
    ['--theme-accent' as any]: accent,
    ['--theme-accent-2' as any]: accent2,
    ['--theme-accent-3' as any]: accent3,
    ['--theme-accent-soft' as any]: accentSoft,
    ['--theme-ink' as any]: ink,
    ['--theme-ink-strong' as any]: inkStrong,
    ['--theme-meta' as any]: meta,
    ['--theme-glass-tint' as any]: glassTint,
    ['--theme-glass-border' as any]: glassBorder,
    ['--theme-glow' as any]: theme.frameGlow,
    ['--theme-title-gradient' as any]: theme.titleGradient,
    ['--theme-scrim' as any]: theme.archTint,
  };

  return (
    <div
      className={`event-themed event-themed--${mode}`}
      style={cssVars}
      data-flyer-theme={theme.key}
    >
      {/* Fixed ambient backdrop — sits behind the page content */}
      <div className="event-themed-backdrop" aria-hidden="true">
        <div
          className="event-themed-backdrop__image"
          style={{ backgroundImage: `url(${theme.bg})` }}
        />
        <div
          className="event-themed-backdrop__scrim"
          style={{ background: theme.archTint }}
        />
        <div
          className="event-themed-backdrop__blob event-themed-backdrop__blob--a"
          style={{ background: accent }}
        />
        <div
          className="event-themed-backdrop__blob event-themed-backdrop__blob--b"
          style={{ background: accent2 }}
        />
      </div>


      {children}
    </div>
  );
}
