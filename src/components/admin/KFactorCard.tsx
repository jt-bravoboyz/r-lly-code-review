import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';
import { InfoTip } from './InfoTip';

interface KFactorCardProps {
  kFactor: number;
  inviteCopied: number;
  totalEvents: number;
  /** When true, renders without Card chrome (for use inside a BentoCard). */
  embedded?: boolean;
}

export function KFactorCard({ kFactor, inviteCopied, totalEvents, embedded = false }: KFactorCardProps) {
  const Body = (
    <>
      <p className="text-4xl font-bold font-montserrat tabular-nums">{kFactor.toFixed(2)}x</p>
      <p className="text-xs text-muted-foreground mt-1">
        {inviteCopied} invite{inviteCopied !== 1 ? 's' : ''} copied across {totalEvents} rall
        {totalEvents !== 1 ? 'ies' : 'y'}
      </p>
    </>
  );

  const Header = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Share2 className="h-4 w-4" />
      <span>Virality — K-Factor</span>
      <InfoTip text="K-Factor measures how viral the app is. It's the average number of new invites generated per R@lly. Anything above 1.0 means the app grows on its own." />
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        {Header}
        {Body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle asChild>
          <div>{Header}</div>
        </CardTitle>
      </CardHeader>
      <CardContent>{Body}</CardContent>
    </Card>
  );
}
