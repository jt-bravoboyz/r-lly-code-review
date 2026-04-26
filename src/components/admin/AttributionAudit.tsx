import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { cn } from '@/lib/utils';

export interface AttributionAuditData {
  totalInvites: number;
  sumOfHostInvites: number;
  invitesReconciled: boolean;
  totalAttendees: number;
  sumOfHostAttendees: number;
  verifiedFootTraffic: number;
}

interface Props {
  audit: AttributionAuditData;
}

/**
 * Field-debugger view of the Hamilton no-echoes invariant:
 *   Σ host invites === global invite total
 *   Σ host attendees ≈ total attendees (drift = orphan rows)
 * High-contrast on purpose — must stay readable in the field.
 */
export function AttributionAudit({ audit }: Props) {
  const inviteDelta = audit.totalInvites - audit.sumOfHostInvites;
  const attendeeDelta = audit.totalAttendees - audit.sumOfHostAttendees;
  const ok = audit.invitesReconciled;

  return (
    <BentoCard span={12}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Attribution Audit
        </span>
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
            ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
              : 'border-amber-500/50 bg-amber-500/10 text-amber-500',
          )}
        >
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {ok ? 'Reconciled' : `Drift: ${inviteDelta > 0 ? '+' : ''}${inviteDelta}`}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
        <Row label="Total Invites" value={audit.totalInvites} />
        <Row label="Σ Host Invites" value={audit.sumOfHostInvites} />
        <Row
          label="Invite Δ"
          value={inviteDelta}
          tone={inviteDelta === 0 ? 'ok' : 'warn'}
        />
        <Row label="Total Attendees" value={audit.totalAttendees} />
        <Row label="Σ Host Attendees" value={audit.sumOfHostAttendees} />
        <Row
          label="Attendee Δ"
          value={attendeeDelta}
          tone={attendeeDelta === 0 ? 'ok' : 'muted'}
        />
        <Row label="Verified Foot Traffic" value={audit.verifiedFootTraffic} span2 />
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
        Invariant: <code className="text-foreground">Σ host invites === total invites</code>.
        If drift ≠ 0, the attribution loop dropped a host (check{' '}
        <code className="text-foreground">invitesByProfile</code> in <code>useAdminData</code>).
      </p>
    </BentoCard>
  );
}

function Row({
  label,
  value,
  tone = 'default',
  span2 = false,
}: {
  label: string;
  value: number;
  tone?: 'default' | 'ok' | 'warn' | 'muted';
  span2?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5',
        span2 && 'col-span-2 sm:col-span-3',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'tabular-nums font-semibold',
          tone === 'ok' && 'text-emerald-500',
          tone === 'warn' && 'text-amber-500',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}
