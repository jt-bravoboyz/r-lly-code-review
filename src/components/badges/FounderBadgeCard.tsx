import { Crown } from 'lucide-react';

interface FounderBadgeCardProps {
  isEarned: boolean;
  founderNumber?: number | null;
}

export function FounderBadgeCard({ isEarned, founderNumber }: FounderBadgeCardProps) {
  if (!isEarned) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#F47A19]/30 bg-card/60 backdrop-blur-xl p-5 founder-badge-card">
      {/* Shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none founder-shimmer" />

      <div className="relative flex items-center gap-4">
        {/* Icon with glow ring */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#F47A19]/15 border-2 border-[#F47A19]/40 founder-icon-glow">
            <Crown className="w-8 h-8 text-[#F47A19]" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold font-montserrat text-foreground">
            Founder 25
          </span>
          {founderNumber && (
            <span className="text-sm font-semibold text-[#F47A19]">
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
          0%, 100% { box-shadow: 0 0 12px 2px rgba(244,122,25,0.15), inset 0 0 8px rgba(244,122,25,0.05); }
          50% { box-shadow: 0 0 24px 6px rgba(244,122,25,0.3), inset 0 0 12px rgba(244,122,25,0.08); }
        }
        .founder-badge-card {
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
          background: linear-gradient(90deg, transparent, rgba(244,122,25,0.08), transparent);
          animation: founderShimmer 4s ease-in-out infinite;
        }
        @keyframes founderIconGlow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(244,122,25,0.2); }
          50% { box-shadow: 0 0 16px 4px rgba(244,122,25,0.4); }
        }
        .founder-icon-glow {
          animation: founderIconGlow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
