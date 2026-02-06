import { useState, useEffect } from 'react';
import { Check, X, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingJoinRequests, useAcceptJoinRequest, useDeclineJoinRequest } from '@/hooks/useJoinRequests';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface PendingJoinRequestsProps {
  eventId: string;
}

export function PendingJoinRequests({ eventId }: PendingJoinRequestsProps) {
  const { data: requests, isLoading } = usePendingJoinRequests(eventId);
  const acceptRequest = useAcceptJoinRequest();
  const declineRequest = useDeclineJoinRequest();
  const queryClient = useQueryClient();
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  // Subscribe to realtime updates for new join requests
  useEffect(() => {
    const channel = supabase
      .channel(`pending-requests-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  const handleAccept = async (attendeeId: string) => {
    setRespondingIds(prev => new Set([...prev, attendeeId]));
    try {
      await acceptRequest.mutateAsync({ attendeeId, eventId });
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(attendeeId);
        return next;
      });
    }
  };

  const handleDecline = async (attendeeId: string) => {
    setRespondingIds(prev => new Set([...prev, attendeeId]));
    try {
      await declineRequest.mutateAsync({ attendeeId, eventId });
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(attendeeId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-secondary/30 bg-gradient-to-r from-secondary/10 to-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 font-montserrat">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-secondary" />
          </div>
          <span>Join Requests</span>
          <Badge variant="secondary" className="ml-auto">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {requests.map((request) => {
          const isResponding = respondingIds.has(request.id);
          
          return (
            <div 
              key={request.id} 
              className="flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border"
            >
              <Avatar className="h-10 w-10 border-2 border-secondary/30">
                <AvatarImage src={request.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary/10 text-secondary">
                  {request.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {request.profile?.display_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(request.joined_at), { addSuffix: true })}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => handleDecline(request.id)}
                  disabled={isResponding}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleAccept(request.id)}
                  disabled={isResponding}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
