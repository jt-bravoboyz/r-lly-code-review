import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';

interface TopConnectorsProps {
  topConnectors: Array<{
    profileId: string;
    referralCount: number;
    displayName: string;
    avatarUrl: string | null;
  }>;
}

export function TopConnectors({ topConnectors }: TopConnectorsProps) {
  if (topConnectors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Top Connectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No referral signups yet. Share invite links to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Top Connectors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topConnectors.map((c, i) => (
          <div key={c.profileId} className="flex items-center gap-3 p-3 rounded-lg border">
            <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.avatarUrl || undefined} />
              <AvatarFallback>{c.displayName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{c.displayName}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {c.referralCount} referral{c.referralCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
