import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';

interface KFactorCardProps {
  kFactor: number;
  inviteCopied: number;
  totalEvents: number;
}

export function KFactorCard({ kFactor, inviteCopied, totalEvents }: KFactorCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Virality — K-Factor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold font-montserrat">{kFactor.toFixed(1)}x</p>
        <p className="text-xs text-muted-foreground mt-1">
          {inviteCopied} invite{inviteCopied !== 1 ? 's' : ''} copied across {totalEvents} rall{totalEvents !== 1 ? 'ies' : 'y'}
        </p>
      </CardContent>
    </Card>
  );
}
