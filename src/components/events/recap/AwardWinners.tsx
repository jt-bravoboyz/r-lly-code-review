import { useState, useCallback, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface Award {
  key: string;
  emoji: string;
  title: string;
  winner: string;
  subtitle?: string;
}

interface AwardSection {
  label: string;
  awards: Award[];
}

const FEATURED: Award = {
  key: 'rallyer-of-the-century',
  emoji: '🏆',
  title: 'R@lly-er of the Century',
  winner: 'Kiree',
  subtitle: 'Top Honor · Drunkies 2026',
};

const SECTIONS: AwardSection[] = [
  {
    label: 'Major Awards',
    awards: [
      { key: 'goat', emoji: '🐐', title: 'GOAT', winner: 'Bennie' },
      { key: 'life-of-the-party', emoji: '🎉', title: 'Life of the Party', winner: 'Zach' },
      { key: 'sober-mvp', emoji: '🛡️', title: 'Sober MVP', winner: 'Martha' },
    ],
  },
  {
    label: 'Class Superlatives',
    awards: [
      { key: 'senior-crush', emoji: '💘', title: 'Senior Crush', winner: 'Meg' },
      { key: 'picasso-patty', emoji: '🎨', title: 'Picasso Patty', winner: 'Erin' },
      { key: 'serve', emoji: '💅', title: 'S.E.R.V.E', winner: 'Amelia' },
      { key: 'powerlift-princess', emoji: '🏋️‍♀️', title: 'Powerlift Princess', winner: 'Kassi' },
      { key: 'drunkest-senior', emoji: '🍺', title: 'Drunkest — Senior', winner: 'Ryann' },
      { key: 'drunkest-junior', emoji: '🍺', title: 'Drunkest — Junior', winner: 'Max' },
      { key: 'drunkest-soph', emoji: '🍺', title: 'Drunkest — Sophomore', winner: 'Alex C' },
      { key: 'drunkest-fresh', emoji: '🍺', title: 'Drunkest — Freshman', winner: 'Harrisyn' },
      { key: 'highest-senior', emoji: '🌿', title: 'Highest — Senior', winner: 'Walker' },
      { key: 'highest-junior', emoji: '🌿', title: 'Highest — Junior', winner: 'Kenzie' },
      { key: 'highest-soph', emoji: '🌿', title: 'Highest — Sophomore', winner: 'Lis' },
      { key: 'highest-fresh', emoji: '🌿', title: 'Highest — Freshman', winner: 'Marley' },
      { key: 'crossed-queen', emoji: '👑', title: 'Crossed — Queen', winner: 'Viv' },
      { key: 'crossed-king', emoji: '👑', title: 'Crossed — King', winner: 'Jake' },
      { key: 'best-dressed', emoji: '🕶️', title: 'Best Dressed', winner: 'Veronica' },
      { key: 'potionmaster', emoji: '🧪', title: 'Potionmaster', winner: 'Mason' },
      { key: 'heavyweight', emoji: '🥊', title: 'Heavyweight', winner: 'Evan' },
      { key: 'lightweight', emoji: '🪶', title: 'Lightweight', winner: 'Ella C' },
    ],
  },
  {
    label: 'Party Legends',
    awards: [
      { key: 'slap', emoji: '✋', title: 'Slap.com', winner: 'Olivia' },
      { key: 'sofa-spooner', emoji: '🛋️', title: 'Sofa Spooner', winner: 'Max McF' },
      { key: 'just-the-tip', emoji: '💸', title: 'Just the TIP', winner: 'Brett' },
      { key: 'overdraft-overlord', emoji: '💳', title: 'Overdraft Overlord', winner: 'Mads' },
      { key: 'have-fun-auntie', emoji: '🥂', title: 'Have Fun Auntie', winner: 'Kayleigh' },
      { key: 'nights-get-lonely', emoji: '🌙', title: 'Nights Get Lonely', winner: 'Liam' },
      { key: 'honorary-junior', emoji: '🎖️', title: 'Honorary Junior', winner: 'Avery' },
      { key: 'puke-and-rally', emoji: '🤮', title: 'Puke and R@lly', winner: 'Ailani' },
      { key: 'greatest-sport', emoji: '🏅', title: 'Greatest Sport', winner: 'Ethan & Tyler' },
      { key: 'department-ally', emoji: '🤝', title: 'Department Ally', winner: 'Livvy' },
      { key: 'will-they-wont-they', emoji: '👀', title: 'Will They Won\u2019t They', winner: 'Jordan & Blonde Freshman' },
      { key: 'jomo', emoji: '🧘', title: 'JOMO', winner: 'Gab' },
      { key: 'crushes', emoji: '💞', title: 'Crushes', winner: 'Sarah Lash & Q' },
    ],
  },
];

interface AwardWinnersProps {
  eventId: string;
  eventTitle: string;
}

function useCheers(eventId: string, awardKey: string) {
  const storageKey = `rally_award_cheers_${eventId}_${awardKey}`;
  const [cheered, setCheered] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { cheered: boolean; count: number };
        setCheered(!!parsed.cheered);
        setCount(parsed.count || 0);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCheered(prev => {
      const next = !prev;
      const nextCount = next ? count + 1 : Math.max(0, count - 1);
      setCount(nextCount);
      try { localStorage.setItem(storageKey, JSON.stringify({ cheered: next, count: nextCount })); } catch { /* ignore */ }
      return next;
    });
  }, [count, storageKey]);

  return { cheered, count, toggle };
}

function CheersButton({ eventId, awardKey }: { eventId: string; awardKey: string }) {
  const { cheered, count, toggle } = useCheers(eventId, awardKey);
  const { triggerHaptic } = useHaptics();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); toggle(); }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-montserrat font-semibold',
        'border transition-all active:scale-95 backdrop-blur-md',
        cheered
          ? 'bg-primary/20 border-primary/50 text-primary'
          : 'bg-background/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40'
      )}
      aria-pressed={cheered}
      aria-label="Cheers"
    >
      <span>🍻</span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function AwardCard({ eventId, award }: { eventId: string; award: Award }) {
  return (
    <div
      className={cn(
        'relative shrink-0 snap-start overflow-hidden rounded-2xl',
        'w-[64vw] max-w-[260px] min-h-[148px] p-4',
        'backdrop-blur-xl bg-card/50 border border-border/40',
        'shadow-[0_4px_20px_hsl(0_0%_0%/0.08)]',
        'flex flex-col justify-between'
      )}
      style={{ WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="space-y-2">
        <div className="text-3xl leading-none">{award.emoji}</div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-montserrat font-bold">
            {award.title}
          </p>
          <p className="text-base font-bold text-foreground font-montserrat leading-tight mt-0.5">
            {award.winner}
          </p>
          {award.subtitle && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">{award.subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <CheersButton eventId={eventId} awardKey={award.key} />
      </div>
    </div>
  );
}

function FeaturedCard({ eventId, award }: { eventId: string; award: Award }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-5',
        'backdrop-blur-xl bg-gradient-to-br from-primary/15 via-card/60 to-primary/5',
        'border-2 border-primary/50 ring-1 ring-primary/30',
        'shadow-[0_0_40px_hsl(27_91%_53%/0.35)]'
      )}
      style={{ WebkitBackdropFilter: 'blur(24px)' }}
    >
      {/* Shimmer sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.25) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'card-shimmer 3.5s ease-in-out infinite',
        }}
      />
      <div className="relative flex items-start gap-4">
        <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg ring-2 ring-primary/40">
          <Trophy className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-montserrat font-bold">
            Top Honor
          </p>
          <h4 className="text-lg font-bold text-foreground font-montserrat leading-tight mt-0.5">
            {award.title}
          </h4>
          <p className="text-2xl font-extrabold text-primary font-montserrat mt-1">
            {award.winner}
          </p>
          {award.subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1">{award.subtitle}</p>
          )}
        </div>
      </div>
      <div className="relative flex justify-end pt-3">
        <CheersButton eventId={eventId} awardKey={award.key} />
      </div>
    </div>
  );
}

export function AwardWinners({ eventId, eventTitle }: AwardWinnersProps) {
  // Auto-light only for the Drunkies recap
  if (!/drunk/i.test(eventTitle)) return null;

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-primary/80 font-montserrat font-bold">
          R@lly Sponsored
        </p>
        <h3 className="text-base font-bold text-foreground font-montserrat">
          🏆 Hall of Fame
        </h3>
      </div>

      <FeaturedCard eventId={eventId} award={FEATURED} />

      {SECTIONS.map((section) => (
        <div key={section.label} className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-montserrat font-bold px-0.5">
            {section.label}
          </h4>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-1">
            {section.awards.map((award) => (
              <AwardCard key={award.key} eventId={eventId} award={award} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
