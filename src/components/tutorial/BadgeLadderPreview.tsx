import { BADGE_TIERS } from '@/lib/badges';

// Show a curated subset of tiers to keep it compact
const PREVIEW_TIERS = ['bronze', 'gold', 'emerald', 'ruby', 'diamond', 'dark_matter'];

export function BadgeLadderPreview() {
  const tiers = BADGE_TIERS.filter(t => PREVIEW_TIERS.includes(t.id));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-3 uppercase">
        Rank Progression
      </p>
      <div className="flex items-center justify-between gap-1">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="flex flex-col items-center gap-1.5 flex-1">
            {/* Tier emblem circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: tier.gradient }}
            >
              <span className="text-white text-[10px] font-black">
                {tier.name.charAt(0)}
              </span>
            </div>
            <span className="text-[9px] text-white/50 font-medium leading-tight text-center">
              {tier.name === 'Dark Matter' ? 'Dark\nMatter' : tier.name}
            </span>
            {/* Connector dot between tiers */}
            {i < tiers.length - 1 && (
              <div className="absolute" style={{ display: 'none' }} />
            )}
          </div>
        ))}
      </div>
      {/* Progress hint */}
      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: '12%',
            background: 'linear-gradient(90deg, #B95B39, #FFC64F)',
          }}
        />
      </div>
      <p className="text-[10px] text-white/40 mt-1.5 text-center">
        You start at Bronze — how far can you climb?
      </p>
    </div>
  );
}

