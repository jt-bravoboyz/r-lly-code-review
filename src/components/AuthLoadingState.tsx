import { useEffect, useState, useRef } from 'react';
import rallyLogo from '@/assets/rally-logo.png';

interface AuthLoadingStateProps {
  authResolved: boolean;
  onComplete?: () => void;
  minHoldMs?: number;
}

const BRAND_ORANGE = '#F47A19';

/**
 * Cinematic activation-style auth loading state.
 * Layers: deep dark base → breathing radial → rotating light beams →
 * expanding pulse rings → progress ring → glassmorphic logo → STANDBY label.
 */
export function AuthLoadingState({
  authResolved,
  onComplete,
  minHoldMs = 1200,
}: AuthLoadingStateProps) {
  const mountTimeRef = useRef<number>(Date.now());
  const [progress, setProgress] = useState(0);
  const [flashing, setFlashing] = useState(false);
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

  // Drive progress ring with ease-out cubic toward a moving target.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - mountTimeRef.current;
      // Until auth resolves, asymptote toward 90%; after resolve, race to 100%.
      const target = authResolved
        ? 1
        : Math.min(0.9, elapsed / Math.max(minHoldMs, 1));
      setProgress((prev) => {
        const delta = target - prev;
        // ease-out cubic-ish step
        const next = prev + delta * 0.08;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [authResolved, minHoldMs]);

  // Handle completion: enforce min hold, then flash, then fade out.
  useEffect(() => {
    if (!authResolved) return;
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, minHoldMs - elapsed);
    const t1 = setTimeout(() => {
      setProgress(1);
      setFlashing(true);
      const t2 = setTimeout(() => {
        setFadingOut(true);
        const t3 = setTimeout(() => {
          onComplete?.();
        }, 260);
        // store cleanup via closure
        (t1 as unknown as { _t3?: number })._t3 = t3 as unknown as number;
      }, 150);
      (t1 as unknown as { _t2?: number })._t2 = t2 as unknown as number;
    }, remaining);
    return () => {
      clearTimeout(t1);
      const inner = t1 as unknown as { _t2?: number; _t3?: number };
      if (inner._t2) clearTimeout(inner._t2);
      if (inner._t3) clearTimeout(inner._t3);
    };
  }, [authResolved, minHoldMs, onComplete]);

  // Progress ring geometry
  const size = 132;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 250ms ease-out',
      }}
      aria-hidden="true"
    >
      {/* Background breathing radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${BRAND_ORANGE}1F 0%, transparent 60%)`,
          animation: prefersReducedMotion
            ? undefined
            : 'auth-radial-breathe 3s ease-in-out infinite',
        }}
      />

      {/* Rotating light beams */}
      {!prefersReducedMotion && (
        <div
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{
            width: 1,
            height: 1,
            animation: 'auth-beams-rotate 14s linear infinite',
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: '2px',
                height: '120vmax',
                marginLeft: '-1px',
                marginTop: '-60vmax',
                background: `linear-gradient(to bottom, transparent 0%, ${BRAND_ORANGE}40 45%, ${BRAND_ORANGE}40 55%, transparent 100%)`,
                filter: 'blur(12px)',
                opacity: 0.7,
                transform: `rotate(${(360 / 5) * i}deg)`,
                transformOrigin: 'center center',
                animation: 'auth-beams-pulse 1.8s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Center stack */}
      <div className="relative flex flex-col items-center">


        <div className="relative" style={{ width: size, height: size }}>
          {/* Expanding pulse ring — centered on logo */}
          {!prefersReducedMotion && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `1.5px solid ${BRAND_ORANGE}`,
                animation: 'auth-pulse-ring 1.8s ease-out infinite',
              }}
            />
          )}

          {/* Progress ring */}
          <svg

            width={size}
            height={size}
            className="absolute inset-0"
            style={{
              filter: flashing
                ? `drop-shadow(0 0 12px ${BRAND_ORANGE})`
                : undefined,
              transition: 'filter 150ms ease-out',
            }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={flashing ? '#FFD4B0' : BRAND_ORANGE}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke 150ms ease-out' }}
            />
          </svg>

          {/* Logo container */}
          <div
            className="absolute inset-2 rounded-full bg-white/[0.06] backdrop-blur-xl flex items-center justify-center shadow-2xl ring-1 ring-white/[0.10] overflow-hidden"
            style={{
              animation: prefersReducedMotion
                ? undefined
                : 'auth-logo-breathe 2.2s ease-in-out infinite',
            }}
          >
            {/* Inner orange glow */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `inset 0 0 16px ${BRAND_ORANGE}33`,
                animation: prefersReducedMotion
                  ? undefined
                  : 'auth-inner-glow 2.2s ease-in-out infinite',
              }}
            />
            <img
              src={rallyLogo}
              alt="R@lly"
              className="w-16 h-16 object-contain relative"
              draggable={false}
              loading="eager"
              decoding="sync"
              {...({ fetchpriority: 'high' } as Record<string, string>)}
            />


          </div>
        </div>

      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes auth-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes auth-radial-breathe {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        @keyframes auth-beams-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes auth-beams-pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        @keyframes auth-pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes auth-logo-breathe {
          0%, 100% { transform: scale(0.96); }
          50% { transform: scale(1.04); }
        }
        @keyframes auth-inner-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-auth-loading] * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
