import { useMemo } from 'react';
import { Beer, Home, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoguePolls, useSubmitRoguePoll, type RoguePollChoice } from '@/hooks/useRoguePolls';
import { cn } from '@/lib/utils';

interface RogueAlertLite {
  id: string;
  created_at: string;
  profile_id: string;
  profile?: { display_name: string | null } | null;
}

interface RogueAutoPollProps {
  eventId: string;
  alerts: RogueAlertLite[];
  reactions: Array<{ rogue_alert_id: string }>;
}

const STALE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours — stop nagging eventually

const CHOICES: Array<{ key: RoguePollChoice; label: string; Icon: typeof Beer }> = [
  { key: 'bar', label: 'Bar', Icon: Beer },
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'unknown', label: 'Unknown', Icon: HelpCircle },
];

/**
 * One-tap "Where they going?" prompt that appears when a rogue alert is
 * >5min old and has zero reactions. Forces engagement so the night doesn't
 * silently flatline.
 */
export function RogueAutoPoll({ eventId, alerts, reactions }: RogueAutoPollProps) {
  const { profile } = useAuth();
  const alertIds = useMemo(() => alerts.map(a => a.id), [alerts]);
  const polls = useRoguePolls(eventId, alertIds);
  const submitPoll = useSubmitRoguePoll();

  const target = useMemo(() => {
    const now = Date.now();
    return alerts.find(a => {
      if (a.profile_id === profile?.id) return false;
      const age = now - new Date(a.created_at).getTime();
      if (age < STALE_MS || age > MAX_AGE_MS) return false;
      const hasReactions = reactions.some(r => r.rogue_alert_id === a.id);
      if (hasReactions) return false;
      // Skip if I've already voted
      const myVote = polls.find(p => p.rogue_alert_id === a.id && p.profile_id === profile?.id);
      if (myVote) return false;
      return true;
    }) || null;
  }, [alerts, reactions, polls, profile?.id]);

  if (!target) return null;

  const counts: Record<RoguePollChoice, number> = { bar: 0, home: 0, unknown: 0 };
  polls.filter(p => p.rogue_alert_id === target.id).forEach(p => {
    counts[p.choice] = (counts[p.choice] || 0) + 1;
  });
  const totalVotes = counts.bar + counts.home + counts.unknown;

  const name = target.profile?.display_name || 'Someone';

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 backdrop-blur-xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary font-montserrat">
            🤔 Where they going?
          </p>
          <p className="text-sm font-semibold text-foreground font-montserrat mt-0.5">
            {name} went rogue — call it.
          </p>
        </div>
        {totalVotes > 0 && (
          <span className="text-[10px] text-muted-foreground font-montserrat shrink-0">
            {totalVotes} vote{totalVotes === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => submitPoll.mutate({ alertId: target.id, choice: key })}
            disabled={submitPoll.isPending}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-3 rounded-xl',
              'bg-background/60 border border-border/40 hover:border-primary/60 hover:bg-primary/10',
              'active:scale-95 transition-all min-h-[64px] disabled:opacity-60'
            )}
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground font-montserrat">{label}</span>
            {counts[key] > 0 && (
              <span className="text-[9px] text-muted-foreground">{counts[key]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
