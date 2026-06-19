import { useEffect, useRef, useState } from 'react';

interface AuthLoadingStateProps {
  authResolved: boolean;
  onComplete?: () => void;
  minHoldMs?: number;
}

const BRAND_ORANGE = '#F47A19';

/**
 * Flag-first auth loader. Mirrors the inline boot splash in index.html
 * byte-for-byte (same SVG flag, same beacon rings, same radial breathe)
 * so the React handoff is visually seamless. Inline SVG = paints on the
 * first frame with zero network/decode.
 */
export function AuthLoadingState({
  authResolved,
  onComplete,
  minHoldMs = 1200,
}: AuthLoadingStateProps) {
  const mountTimeRef = useRef<number>(Date.now());
  const [fadingOut, setFadingOut] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  // Hand off from the inline HTML boot splash to React's loader.
  // The two are visually identical, so fading the splash out the moment
  // React mounts creates a seamless transition with zero flash.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('rally-booted');
    const splash = document.getElementById('rally-boot-splash');
    const removeTimer = window.setTimeout(() => {
      splash?.parentNode?.removeChild(splash);
    }, 400);
    return () => window.clearTimeout(removeTimer);
  }, []);

  // Handle completion: enforce min hold, then fade out.
  const completionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!authResolved) return;
    const timers = completionTimersRef.current;
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, minHoldMs - elapsed);
    const t1 = setTimeout(() => {
      setFadingOut(true);
      const t2 = setTimeout(() => {
        onComplete?.();
      }, 260);
      timers.push(t2);
    }, remaining);
    timers.push(t1);
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.length = 0;
    };
  }, [authResolved, minHoldMs, onComplete]);

  const ringStyle = (delay: string): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 96,
    height: 96,
    marginTop: -48,
    marginLeft: -48,
    borderRadius: '9999px',
    border: `1px solid ${BRAND_ORANGE}`,
    boxShadow: `0 0 8px rgba(244,122,25,0.5)`,
    transform: 'scale(0.5)',
    opacity: prefersReducedMotion ? 0.4 : 0,
    willChange: 'transform, opacity',
    animation: prefersReducedMotion
      ? undefined
      : `auth-flag-pulse 3.6s ease-out infinite`,
    animationDelay: prefersReducedMotion ? undefined : delay,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: '#050505',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 250ms ease-out',
      }}
      aria-hidden="true"
    >
      {/* Ambient radial breathe */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(244,122,25,0.18) 0%, transparent 60%)`,
          animation: prefersReducedMotion
            ? undefined
            : 'auth-flag-breathe 2.2s ease-in-out infinite',
        }}
      />

      {/* Flag stage */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 220, height: 220 }}
      >
        <div style={ringStyle('0s')} />
        <div style={ringStyle('1.2s')} />
        <div style={ringStyle('2.4s')} />

        <svg
          viewBox="0 0 96 96"
          xmlns="http://www.w3.org/2000/svg"
          width={96}
          height={96}
          style={{
            position: 'relative',
            filter: 'drop-shadow(0 6px 18px rgba(244,122,25,0.45))',
            animation: prefersReducedMotion
              ? undefined
              : 'auth-flag-scale 2.4s ease-in-out infinite',
          }}
        >
          <title>R@lly</title>
          <rect x="22" y="14" width="4" height="72" rx="2" fill="#FFFFFF" />
          <circle cx="24" cy="14" r="3" fill="#FFFFFF" />
          <path d="M26 20 H78 Q72 32 78 44 H26 Z" fill={BRAND_ORANGE} />
          <text
            x="52"
            y="38"
            textAnchor="middle"
            fontFamily="Montserrat, system-ui, -apple-system, Helvetica, sans-serif"
            fontWeight={900}
            fontSize={20}
            fill="#0A0A0A"
          >
            @
          </text>
        </svg>
      </div>

      <style>{`
        @keyframes auth-flag-pulse {
          0%   { transform: scale(0.5); opacity: 0.9; }
          80%  { opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes auth-flag-breathe {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes auth-flag-scale {
          0%, 100% { transform: scale(0.98); }
          50%      { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
