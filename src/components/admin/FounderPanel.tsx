import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';

interface FounderPanelProps {
  founders: Array<{
    id: string;
    user_id: string;
    display_name: string | null;
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
  function FounderPanel({ founders, attendees, rallyEvents }, ref) {
    const founderStats = founders.map(f => {
      const hosted = rallyEvents.filter(e => e.creator_id === f.id).length;
      const joined = attendees.filter(a => a.profile_id === f.id && a.status === 'attending').length;
      const safetyConfirmed = attendees.filter(a => a.profile_id === f.id && a.arrived_safely).length;

      return { ...f, hosted, joined, safetyConfirmed };
    });

    const hostedAtLeast1 = founderStats.filter(f => f.hosted >= 1).length;
    const invitedAtLeast3 = 0;
    const founderCount = founders.length;

    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Founding 25
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-xl font-bold">{founderCount}/25</div>
              <div className="text-xs text-muted-foreground">Founders</div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-xl font-bold">
                {founderCount > 0 ? `${(hostedAtLeast1 / founderCount * 100).toFixed(0)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">Hosted ≥1</div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-xl font-bold">{invitedAtLeast3}</div>
              <div className="text-xs text-muted-foreground">Invited ≥3</div>
            </div>
          </div>

          <div className="space-y-2">
            {founderStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No founders assigned yet. Use the database to set founding_member = true on profiles.
              </p>
            )}
            {founderStats.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback>{f.display_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{f.display_name || 'Unnamed'}</span>
                    {f.founder_number && (
                      <Badge variant="secondary" className="text-xs">#{f.founder_number}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {f.hosted} hosted · {f.joined} joined · {f.safetyConfirmed} safe
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);
