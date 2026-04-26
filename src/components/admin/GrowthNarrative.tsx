import { TrendingUp, TrendingDown, Sparkles, Users, Send, Star, Zap } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { InfoTip } from './InfoTip';
import { LiveNowBadge } from './RallyPulse';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ViralHost {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  ralliesCreated: number;
  invitesCopied: number;
  viralCoefficient: number;
  headcountDelivered: number;
}

interface GrowthNarrativeProps {
  kFactor: number;
  totalRallies: number;
  inviteCopied: number;
  topViralHosts: ViralHost[];
  repeatRateThisWeek: number;
  repeatRateDelta: number;
  liveNowCount?: number;
}

/**
 * Hero of the Partner view. Tells the growth story in one glance:
 *   K-Factor → Top viral hosts → Week-over-week repeat-rate delta.
 */
export function GrowthNarrative({
  kFactor,
  totalRallies,
  inviteCopied,
  topViralHosts,
  repeatRateThisWeek,
  repeatRateDelta,
  liveNowCount = 0,
}: GrowthNarrativeProps) {
  const isGrowing = kFactor >= 1;
  const deltaPositive = repeatRateDelta >= 0;

  return (
    <BentoCard variant="hero" span={12}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Growth Narrative
          </span>
        </div>
        {liveNowCount > 0 && <LiveNowBadge count={liveNowCount} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Hero K-Factor headline */}
        <div className="md:col-span-5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-5xl sm:text-6xl font-bold font-montserrat tabular-nums tracking-tight">
              {kFactor.toFixed(2)}x
            </span>
            <InfoTip text="Viral Coefficient (K-Factor): the average number of new invites generated per R@lly. Above 1.0 means the app is growing on its own — every R@lly creates more than one new R@lly through invites." />
          </div>
          <div className="mt-2">
            <VelocityBadge isGrowing={isGrowing} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Each R@lly creates{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {kFactor.toFixed(2)} new invites
            </span>{' '}
            on average.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill icon={<Users className="h-3 w-3" />} tone="muted">
              <span className="tabular-nums">{totalRallies}</span> R@llies
            </MetricPill>
            <MetricPill icon={<Send className="h-3 w-3" />} tone="muted">
              <span className="tabular-nums">{inviteCopied}</span> invites sent
            </MetricPill>
            <MetricPill
              icon={deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              tone={deltaPositive ? 'success' : 'warning'}
            >
              <span className="tabular-nums">{deltaPositive ? '+' : ''}{repeatRateDelta.toFixed(1)}%</span> repeat WoW
            </MetricPill>
          </div>
        </div>

        {/* Top viral hosts (up to 5) */}
        <div className="md:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">Top Hosts by Impact</h3>
            <InfoTip text="Ranked by total attendees delivered (real impact), with viral coefficient (invites per R@lly) as a tiebreaker. The pill shows their personal K-factor — invites sent per R@lly created." />
          </div>
          {topViralHosts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Viral hosts will appear once R@llies start generating invites.
            </p>
          ) : (
            <div className="space-y-2">
              {topViralHosts.map((host, idx) => (
                <HostRow key={host.profileId} host={host} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

function VelocityBadge({ isGrowing }: { isGrowing: boolean }) {
  if (isGrowing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
        <Zap className="h-3 w-3" />
        High Velocity
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
      Below Threshold
    </span>
  );
}

function HostRow({ host, idx }: { host: ViralHost; idx: number }) {
  const isTrendsetter = idx === 0 && host.invitesCopied > 0;

  // Hamilton rule: only show metric segments with non-zero values.
  const segments: { value: number; label: string }[] = [];
  if (host.ralliesCreated > 0) segments.push({ value: host.ralliesCreated, label: 'R@llies' });
  if (host.invitesCopied > 0) segments.push({ value: host.invitesCopied, label: 'invites' });
  if (host.headcountDelivered > 0) segments.push({ value: host.headcountDelivered, label: 'attendees' });

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-3 transition-colors hover:bg-background/70">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
          idx === 0 && 'bg-primary text-primary-foreground',
          idx === 1 && 'bg-primary/30 text-primary',
          idx === 2 && 'bg-primary/15 text-primary',
          idx >= 3 && 'bg-muted text-muted-foreground'
        )}
      >
        {idx + 1}
      </span>
      <Avatar className="h-9 w-9">
        <AvatarImage src={host.avatarUrl || undefined} alt={host.displayName} />
        <AvatarFallback className="text-xs">
          {host.displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate">{host.displayName}</span>
          {isTrendsetter && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-400/20 to-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
              <Star className="h-2.5 w-2.5 fill-amber-500" />
              Trendsetter
            </span>
          )}
        </div>
        {segments.length > 0 && (
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {segments.map((s, i) => (
              <span key={s.label}>
                {i > 0 && ' · '}
                {s.value} {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <MetricPill tone="accent">
        <span className="tabular-nums">{host.viralCoefficient.toFixed(2)}x</span>
      </MetricPill>
    </div>
  );
}
