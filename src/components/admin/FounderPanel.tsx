import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, ShieldCheck, Users, Calendar, Send } from 'lucide-react';
import { getPrivateName, hasNickname } from '@/lib/identity';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

interface FounderPanelProps {
  founders: Array<{
    id: string;
    user_id: string;
    display_name: string | null;
    full_name?: string | null;
    nickname?: string | null;
    avatar_url: string | null;
    founding_member: boolean | null;
    founder_number: number | null;
    created_at: string | null;
  }>;
  attendees: Array<{
    profile_id: string;
    event_id: string;
    arrived_safely: boolean | null;
    status: string | null;
  }>;
  rallyEvents: Array<{
    id: string;
    creator_id: string;
  }>;
  referralCounts?: Record<string, number>;
}

export const FounderPanel = React.forwardRef<HTMLDivElement, FounderPanelProps>(
  function FounderPanel({ founders, attendees, rallyEvents, referralCounts = {} }, ref) {
    const founderStats = founders.map(f => {
      const hosted = rallyEvents.filter(e => e.creator_id === f.id).length;
      const joined = attendees.filter(a => a.profile_id === f.id && a.status === 'attending').length;
      const safe = attendees.filter(a => a.profile_id === f.id && a.arrived_safely).length;
      const referrals = referralCounts[f.id] || 0;
      return { ...f, hosted, joined, safe, referrals };
    });

    const founderCount = founders.length;
    const hostedAtLeast1 = founderStats.filter(f => f.hosted >= 1).length;
    const connected = founderStats.filter(f => f.referrals >= 1).length;
    const safeFounders = founderStats.filter(f => f.safe >= 1).length;

    const pulse = [
      { label: 'Claimed', value: `${founderCount}/25`, icon: Award },
      { label: 'Hosted', value: String(hostedAtLeast1), icon: Calendar },
      { label: 'Connected', value: String(connected), icon: Send },
      { label: 'Safe', value: String(safeFounders), icon: ShieldCheck },
    ];

    return (
      <div ref={ref}>
        <BentoCard variant="hero" span={12}>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Founder Pulse
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {pulse.map(p => (
              <div
                key={p.label}
                className="rounded-2xl border border-border/40 bg-background/40 p-4"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <p.icon className="h-3 w-3" />
                  {p.label}
                </div>
                <div className="mt-1.5 text-2xl sm:text-3xl font-bold font-montserrat tabular-nums tracking-tight">
                  {p.value}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {founderStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No founders assigned yet.
              </p>
            )}
            {founderStats.map(f => {
              const segments: { label: string; value: number }[] = [];
              if (f.hosted > 0) segments.push({ label: 'hosted', value: f.hosted });
              if (f.joined > 0) segments.push({ label: 'joined', value: f.joined });
              if (f.safe > 0) segments.push({ label: 'safe', value: f.safe });
              if (f.referrals > 0) segments.push({ label: 'refs', value: f.referrals });

              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/40"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={f.avatar_url || undefined} />
                    <AvatarFallback>{getPrivateName(f as any).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold truncate">{getPrivateName(f as any)}</span>
                      {hasNickname(f as any) && (
                        <span className="text-[10px] text-muted-foreground truncate">"{f.nickname}"</span>
                      )}
                      {f.founder_number && (
                        <MetricPill tone="accent">#{f.founder_number}</MetricPill>
                      )}
                    </div>
                    {segments.length > 0 && (
                      <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                        {segments.map((s, i) => (
                          <span key={s.label}>
                            {i > 0 && ' · '}
                            {s.value} {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </BentoCard>
      </div>
    );
  }
);
