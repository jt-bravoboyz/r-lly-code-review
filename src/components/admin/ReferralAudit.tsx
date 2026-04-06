import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Users } from 'lucide-react';
import { format } from 'date-fns';

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
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <CardTitle className="text-base font-montserrat">Referral Audit</CardTitle>
        <Badge variant="secondary" className="ml-auto">{referralDetails.length}</Badge>
      </CardHeader>
      <CardContent>
        {referralDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No referrals tracked yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referee</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Current Squad</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralDetails.map((r) => (
                <TableRow key={r.refereeId}>
                  <TableCell className="font-medium">{r.referrerName || 'Unknown'}</TableCell>
                  <TableCell>{r.refereeName || 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.refereeCreatedAt ? format(new Date(r.refereeCreatedAt), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={awarding === r.refereeId}
                      onClick={() => handleManualAward(r.referrerId, r.refereeId)}
                    >
                      <Gift className="h-3 w-3 mr-1" />
                      {awarding === r.refereeId ? 'Awarding…' : 'Award'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
