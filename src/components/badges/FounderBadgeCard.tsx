interface FounderBadgeCardProps {
  isEarned: boolean;
  founderNumber?: number | null;
}

export function FounderBadgeCard({ isEarned, founderNumber }: FounderBadgeCardProps) {
  if (!isEarned) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#9B4DCA]/30 bg-card/60 backdrop-blur-xl p-5 founder-card">
      {/* Shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none founder-shimmer" />


      <div className="relative flex items-center gap-5">
        {/* Gem with sparkles */}
        <div className="relative flex-shrink-0 founder-float">
          {/* Sparkle particles */}
          <div className="founder-sparkle founder-sparkle-1" />
          <div className="founder-sparkle founder-sparkle-2" />
          <div className="founder-sparkle founder-sparkle-3" />
          <div className="founder-sparkle founder-sparkle-4" />

          {/* Sonar rings */}
          <div className="founder-sonar-ring founder-sonar-1" />
          <div className="founder-sonar-ring founder-sonar-2" />

          {/* Outer glow */}
          <div className="absolute inset-[-12px] rounded-full founder-outer-glow" />

          {/* Hexagonal gem SVG */}
          <svg width="72" height="88" viewBox="0 0 72 88" fill="none" className="relative z-10 founder-gem">
            <defs>
              <linearGradient id="founderGemGrad" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#5A189A" />
                <stop offset="25%" stopColor="#7B2FBE" />
                <stop offset="50%" stopColor="#C77DFF" />
                <stop offset="75%" stopColor="#9B4DCA" />
                <stop offset="100%" stopColor="#E0AAFF" />
              </linearGradient>
              <linearGradient id="founderGemGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E0AAFF" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#7B2FBE" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#C77DFF" stopOpacity="0.3" />
              </linearGradient>
              <filter id="founderGemGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Main hexagon gem shape */}
            <polygon
              points="36,2 68,22 68,66 36,86 4,66 4,22"
              fill="url(#founderGemGrad)"
              stroke="#C77DFF"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              filter="url(#founderGemGlow)"
            />

            {/* Overlay gradient for depth */}
            <polygon
              points="36,2 68,22 68,66 36,86 4,66 4,22"
              fill="url(#founderGemGrad2)"
            />

            {/* Internal facet lines */}
            <line x1="36" y1="2" x2="36" y2="86" stroke="white" strokeOpacity="0.07" strokeWidth="0.8" />
            <line x1="4" y1="22" x2="68" y2="66" stroke="white" strokeOpacity="0.05" strokeWidth="0.6" />
            <line x1="68" y1="22" x2="4" y2="66" stroke="white" strokeOpacity="0.05" strokeWidth="0.6" />
            <line x1="36" y1="2" x2="4" y2="66" stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />
            <line x1="36" y1="2" x2="68" y2="66" stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />
            <line x1="36" y1="86" x2="4" y2="22" stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />
            <line x1="36" y1="86" x2="68" y2="22" stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />

            {/* Inner highlight edge */}
            <polygon
              points="36,6 64,24 64,64 36,82 8,64 8,24"
              fill="none"
              stroke="white"
              strokeOpacity="0.08"
              strokeWidth="0.5"
            />

            {/* Text inside gem */}
            <text x="36" y="38" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="8" fontWeight="700" letterSpacing="2" fontFamily="Montserrat, sans-serif">
              FOUNDER
            </text>
            <text x="36" y="58" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="20" fontWeight="800" fontFamily="Montserrat, sans-serif">
              25
            </text>
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold font-montserrat text-foreground">
            Founder 25
          </span>
          {founderNumber && (
            <span className="text-sm font-semibold text-[#C77DFF]">
              #{founderNumber}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Permanently Earned · Exclusive
          </span>
        </div>
      </div>

      <style>{`
        @keyframes founderBreathingGlow {
          0%, 100% { box-shadow: 0 0 12px 2px rgba(155,77,202,0.15), inset 0 0 8px rgba(155,77,202,0.05); }
          50% { box-shadow: 0 0 28px 8px rgba(155,77,202,0.35), inset 0 0 12px rgba(199,125,255,0.08); }
        }
        .founder-card {
          animation: founderBreathingGlow 3s ease-in-out infinite;
          -webkit-backdrop-filter: blur(20px);
        }

        @keyframes founderShimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        .founder-shimmer::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 40%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          animation: founderShimmer 4s ease-in-out infinite;
        }

        @keyframes founderFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .founder-float {
          animation: founderFloat 4s ease-in-out infinite;
        }

        @keyframes founderGemShift {
          0% { filter: hue-rotate(0deg) brightness(1); }
          33% { filter: hue-rotate(10deg) brightness(1.1); }
          66% { filter: hue-rotate(-10deg) brightness(0.95); }
          100% { filter: hue-rotate(0deg) brightness(1); }
        }
        .founder-gem {
          animation: founderGemShift 6s ease-in-out infinite;
        }

        @keyframes founderOuterGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .founder-outer-glow {
          background: radial-gradient(circle, rgba(155,77,202,0.3) 0%, rgba(123,47,190,0.1) 50%, transparent 70%);
          animation: founderOuterGlow 3s ease-in-out infinite;
        }

        @keyframes founderSonar {
          0% { transform: scale(0.5); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .founder-sonar-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 1px solid rgba(199,125,255,0.3);
          top: 50%;
          left: 50%;
          margin-top: -40px;
          margin-left: -40px;
        }
        .founder-sonar-1 { animation: founderSonar 4s ease-out infinite; }
        .founder-sonar-2 { animation: founderSonar 4s ease-out infinite 2s; }

        @keyframes founderSparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .founder-sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          z-index: 20;
        }
        .founder-sparkle::before,
        .founder-sparkle::after {
          content: '';
          position: absolute;
          background: #E0AAFF;
          border-radius: 1px;
        }
        .founder-sparkle::before {
          width: 6px;
          height: 1.5px;
          top: 2.25px;
          left: 0;
        }
        .founder-sparkle::after {
          width: 1.5px;
          height: 6px;
          top: 0;
          left: 2.25px;
        }
        .founder-sparkle-1 { top: -4px; right: 8px; animation: founderSparkle 3s ease-in-out infinite 0s; }
        .founder-sparkle-2 { bottom: 2px; left: -2px; animation: founderSparkle 3s ease-in-out infinite 0.8s; }
        .founder-sparkle-3 { top: 12px; left: -6px; animation: founderSparkle 3s ease-in-out infinite 1.6s; }
        .founder-sparkle-4 { bottom: -2px; right: 4px; animation: founderSparkle 3s ease-in-out infinite 2.4s; }
      `}</style>
    </div>
  );
}
