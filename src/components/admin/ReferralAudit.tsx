import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Users } from 'lucide-react';
import { format } from 'date-fns';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

export interface ReferralDetail {
  refereeId: string;
  refereeName: string | null;
  refereeCreatedAt: string | null;
  referrerId: string;
  referrerName: string | null;
  currentSquad: string | null;
}

interface ReferralAuditProps {
  referralDetails: ReferralDetail[];
}

export function ReferralAudit({ referralDetails }: ReferralAuditProps) {
  const [awarding, setAwarding] = useState<string | null>(null);

  const handleManualAward = async (referrerId: string, refereeId: string) => {
    setAwarding(refereeId);
    try {
      await supabase.rpc('rly_award_points', {
        p_user_id: referrerId,
        p_event_type: 'referral_signup',
        p_source_id: refereeId,
      });
      toast.success('Points awarded successfully');
    } catch (e) {
      console.error('Manual award failed:', e);
      toast.error('Failed to award points');
    } finally {
      setAwarding(null);
    }
  };

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Referral Audit
        </span>
        <MetricPill tone="muted" className="ml-auto">
          <span className="tabular-nums">{referralDetails.length}</span>
        </MetricPill>
      </div>
      {referralDetails.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No referrals tracked yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Referrer</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Referee</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signup</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Squad</th>
                <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {referralDetails.map((r) => (
                <tr key={r.refereeId} className="border-b border-border/20 last:border-0 hover:bg-background/40 transition-colors">
                  <td className="py-2 px-2 font-medium">{r.referrerName || 'Unknown'}</td>
                  <td className="py-2 px-2">{r.refereeName || 'Unknown'}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs tabular-nums">
                    {r.refereeCreatedAt ? format(new Date(r.refereeCreatedAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {r.currentSquad ? (
                      <MetricPill tone="muted">{r.currentSquad}</MetricPill>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={awarding === r.refereeId}
                      onClick={() => handleManualAward(r.referrerId, r.refereeId)}
                    >
                      <Gift className="h-3 w-3 mr-1" />
                      {awarding === r.refereeId ? 'Awarding…' : 'Award'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BentoCard>
  );
}
