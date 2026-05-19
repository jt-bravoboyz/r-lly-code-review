import { useState, useEffect } from 'react';
import { getPublicName } from '@/lib/identity';
import { Check, X, UserPlus, Clock, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePendingJoinRequests,
  useAcceptJoinRequest,
  useDeclineJoinRequest,
  useDeclinedAttendees,
  useReinviteAttendee,
} from '@/hooks/useJoinRequests';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface PendingJoinRequestsProps {
  eventId: string;
}

export function PendingJoinRequests({ eventId }: PendingJoinRequestsProps) {
  const { data: requests, isLoading } = usePendingJoinRequests(eventId);
  const { data: declined } = useDeclinedAttendees(eventId);
  const acceptRequest = useAcceptJoinRequest();
  const declineRequest = useDeclineJoinRequest();
  const reinviteRequest = useReinviteAttendee();
  const queryClient = useQueryClient();
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [showDeclined, setShowDeclined] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`pending-requests-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
          queryClient.invalidateQueries({ queryKey: ['declined-attendees', eventId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  const handleAccept = async (attendeeId: string) => {
    setRespondingIds(prev => new Set([...prev, attendeeId]));
    try {
      await acceptRequest.mutateAsync({ attendeeId, eventId });
    } finally {
      setRespondingIds(prev => { const n = new Set(prev); n.delete(attendeeId); return n; });
    }
  };

  const handleDecline = async (attendeeId: string, profileId: string) => {
    setRespondingIds(prev => new Set([...prev, attendeeId]));
    try {
      await declineRequest.mutateAsync({ attendeeId, eventId, profileId });
    } finally {
      setRespondingIds(prev => { const n = new Set(prev); n.delete(attendeeId); return n; });
    }
  };

  const handleReinvite = async (profileId: string) => {
    await reinviteRequest.mutateAsync({ eventId, profileId });
  };

  const hasPending = (requests?.length ?? 0) > 0;
  const hasDeclined = (declined?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  if (!hasPending && !hasDeclined) return null;

  return (
    <Card className="border-secondary/30 bg-gradient-to-r from-secondary/10 to-primary/5 overflow-hidden">
      {hasPending && (
        <>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 font-montserrat">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-secondary" />
              </div>
              <span>Join Requests</span>
              <Badge variant="secondary" className="ml-auto">{requests!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {requests!.map((request) => {
              const isResponding = respondingIds.has(request.id);
              return (
                <div key={request.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border">
                  <Avatar className="h-10 w-10 border-2 border-secondary/30">
                    <AvatarImage src={request.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary/10 text-secondary">
                      {request.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getPublicName(request.profile)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(request.joined_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => handleDecline(request.id, request.profile_id)} disabled={isResponding}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm"
                      className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleAccept(request.id)} disabled={isResponding}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </>
      )}

      {hasDeclined && (
        <div className={hasPending ? 'border-t border-border/50' : ''}>
          <button
            type="button"
            onClick={() => setShowDeclined((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Previously declined ({declined!.length})</span>
            {showDeclined ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showDeclined && (
            <div className="space-y-2 px-4 pb-4">
              {declined!.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60">
                  <Avatar className="h-9 w-9 opacity-70">
                    <AvatarImage src={d.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {d.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getPublicName(d.profile)}</p>
                    <p className="text-xs text-muted-foreground">
                      Declined {d.declined_at ? formatDistanceToNow(new Date(d.declined_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 rounded-full gap-1.5"
                    onClick={() => handleReinvite(d.profile_id)} disabled={reinviteRequest.isPending}>
                    <RotateCw className="h-3.5 w-3.5" /> Re-invite
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
