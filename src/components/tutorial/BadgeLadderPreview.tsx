import { BADGE_TIERS } from '@/lib/badges';
import { TierBadgeIcon } from '@/components/badges/TierBadgeIcon';
import type { BadgeTier } from '@/hooks/useBadgeSystem';

const PREVIEW_TIERS = ['bronze', 'gold', 'emerald', 'ruby', 'diamond', 'dark_matter'];

export function BadgeLadderPreview() {
  const tiers = BADGE_TIERS.filter(t => PREVIEW_TIERS.includes(t.id));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 my-4">
      <p className="text-[10px] font-bold tracking-widest text-white/40 mb-3 uppercase">
        Rank Progression
      </p>
      <div className="flex items-center justify-between gap-1">
        {tiers.map((tier) => {
          const mapped: BadgeTier = {
            tier_key: tier.id,
            tier_name: tier.name,
            min_points: tier.pointsRequired,
            max_points: null,
            sort_order: 0,
            icon_path: null,
            gradient: tier.gradient,
            accent_color: tier.accentColor,
            congrats_title: '',
            congrats_body: '',
          };

          return (
            <div key={tier.id} className="flex flex-col items-center gap-1.5 flex-1">
              <TierBadgeIcon tier={mapped} size="sm" />
              <span className="text-[9px] text-white/50 font-medium leading-tight text-center">
                {tier.name === 'Dark Matter' ? 'Dark\nMatter' : tier.name}
              </span>
            </div>
          );
        })}
      </div>
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
