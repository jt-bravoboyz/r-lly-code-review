import { useFounderIds } from '@/hooks/useFounderIds';

interface MiniFounderGemProps {
  profileId: string;
  className?: string;
}

/**
 * MiniFounderGem — a tiny military-style medal awarded to Founding 25 members.
 * Renders as a ribbon-suspended metallic purple coin with a star, rim highlights,
 * and a slow shimmer sweep. Replaces the previous flat purple polygon "blob".
 */
export function MiniFounderGem({ profileId, className }: MiniFounderGemProps) {
  const { data: founderIds } = useFounderIds();

  if (!founderIds?.has(profileId)) return null;

  return (
    <span
      className={className || 'inline-flex items-center align-middle ml-1'}
      title="Founding Member"
      aria-label="Founding Member medal"
    >
      <svg
        width="18"
        height="22"
        viewBox="0 0 18 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mini-founder-medal"
      >
        <defs>
          {/* Ribbon: horizontal purple stripes with a darker center */}
          <linearGradient id="mfgRibbon" x1="0" y1="0" x2="18" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5A1F8C" />
            <stop offset="35%" stopColor="#9B4DCA" />
            <stop offset="50%" stopColor="#3E1466" />
            <stop offset="65%" stopColor="#9B4DCA" />
            <stop offset="100%" stopColor="#5A1F8C" />
          </linearGradient>

          {/* Coin face: radial metallic purple */}
          <radialGradient id="mfgCoin" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#E0B8FF" />
            <stop offset="35%" stopColor="#9B4DCA" />
            <stop offset="80%" stopColor="#4A1480" />
            <stop offset="100%" stopColor="#2A0A4A" />
          </radialGradient>

          {/* Coin rim */}
          <linearGradient id="mfgRim" x1="0" y1="0" x2="18" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F0D4FF" />
            <stop offset="50%" stopColor="#5A1F8C" />
            <stop offset="100%" stopColor="#1B0530" />
          </linearGradient>

          {/* Star */}
          <linearGradient id="mfgStar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F2D8FF" />
            <stop offset="100%" stopColor="#B080E0" />
          </linearGradient>

          {/* Shimmer clipped to coin */}
          <clipPath id="mfgCoinClip">
            <circle cx="9" cy="14" r="6.25" />
          </clipPath>

          <filter id="mfgGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* Ribbon (slightly tapered toward the coin) */}
        <path d="M5.5 1 H12.5 L13.2 7.5 H4.8 Z" fill="url(#mfgRibbon)" />
        {/* Ribbon shadow under coin */}
        <path d="M4.8 7.5 H13.2 L12.6 8.6 H5.4 Z" fill="#1B0530" opacity="0.55" />

        {/* Coin rim */}
        <circle cx="9" cy="14" r="7" fill="url(#mfgRim)" />
        {/* Coin face */}
        <circle cx="9" cy="14" r="6.25" fill="url(#mfgCoin)" />

        {/* Engraved inner ring */}
        <circle
          cx="9"
          cy="14"
          r="5.2"
          fill="none"
          stroke="#1B0530"
          strokeOpacity="0.55"
          strokeWidth="0.4"
        />
        <circle
          cx="9"
          cy="14.3"
          r="5.2"
          fill="none"
          stroke="#F0D4FF"
          strokeOpacity="0.35"
          strokeWidth="0.25"
        />

        {/* 5-point star */}
        <g filter="url(#mfgGlow)">
          <polygon
            points="9,10.6 9.85,13.0 12.4,13.0 10.35,14.5 11.15,16.9 9,15.4 6.85,16.9 7.65,14.5 5.6,13.0 8.15,13.0"
            fill="url(#mfgStar)"
          />
        </g>

        {/* Top specular highlight */}
        <ellipse cx="7.2" cy="10.8" rx="3.2" ry="1.1" fill="#FFFFFF" opacity="0.35" />

        {/* Shimmer sweep, clipped to coin */}
        <g clipPath="url(#mfgCoinClip)">
          <rect
            className="mini-founder-shimmer"
            x="-10"
            y="6"
            width="6"
            height="18"
            fill="#FFFFFF"
            opacity="0.55"
            transform="rotate(20 -7 15)"
          />
        </g>
      </svg>

      <style>{`
        .mini-founder-medal {
          filter:
            drop-shadow(0 1px 1.5px rgba(0,0,0,0.45))
            drop-shadow(0 0 4px rgba(155, 77, 202, 0.35));
        }
        @keyframes miniFounderShimmer {
          0%   { transform: translateX(0)    rotate(20deg); opacity: 0; }
          15%  { opacity: 0.55; }
          50%  { transform: translateX(28px) rotate(20deg); opacity: 0.55; }
          70%  { opacity: 0; }
          100% { transform: translateX(28px) rotate(20deg); opacity: 0; }
        }
        .mini-founder-shimmer {
          transform-origin: center;
          animation: miniFounderShimmer 4.2s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}
