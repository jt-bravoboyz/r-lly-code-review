import { TrendingUp, TrendingDown, Sparkles, Users, Send } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { InfoTip } from './InfoTip';
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
}: GrowthNarrativeProps) {
  const isGrowing = kFactor >= 1;
  const deltaPositive = repeatRateDelta >= 0;

  return (
    <BentoCard variant="hero" span={12}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Growth Narrative
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Hero K-Factor headline */}
        <div className="md:col-span-5">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-bold font-montserrat tabular-nums tracking-tight">
              {kFactor.toFixed(2)}x
            </span>
            <InfoTip text="Viral Coefficient (K-Factor): the average number of new invites generated per R@lly. Above 1.0 means the app is growing on its own — every R@lly creates more than one new R@lly through invites." />
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Each R@lly creates{' '}
            <span className="font-semibold text-foreground">
              {kFactor.toFixed(2)} new invites
            </span>{' '}
            on average. {isGrowing ? "We're growing on our own." : 'Below the viral threshold of 1.0x.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill icon={<Users className="h-3 w-3" />} tone="muted">
              {totalRallies} R@llies
            </MetricPill>
            <MetricPill icon={<Send className="h-3 w-3" />} tone="muted">
              {inviteCopied} invites sent
            </MetricPill>
            <MetricPill
              icon={deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              tone={deltaPositive ? 'success' : 'warning'}
            >
              {deltaPositive ? '+' : ''}{repeatRateDelta.toFixed(1)}% repeat WoW
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
                <div
                  key={host.profileId}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-3 transition-colors hover:bg-background/70"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      idx === 0 && 'bg-primary text-primary-foreground',
                      idx === 1 && 'bg-primary/20 text-primary',
                      idx === 2 && 'bg-muted text-muted-foreground'
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
                    <div className="text-sm font-semibold truncate">{host.displayName}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {host.ralliesCreated} R@llies · {host.invitesCopied} invites · {host.headcountDelivered} attendees
                    </div>
                  </div>
                  <MetricPill tone="accent">
                    {host.viralCoefficient.toFixed(2)}x
                  </MetricPill>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
