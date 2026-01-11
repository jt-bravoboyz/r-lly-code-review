import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Check, X, Clock, ChevronRight, Users, History } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePastEventInvites, PastEventInvite } from '@/hooks/usePastEventInvites';
import { useInviteHistory, InviteHistoryEntry } from '@/hooks/useInviteHistory';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function InviteHistory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: pastInvites, isLoading: loadingPastInvites } = usePastEventInvites();
  const { data: inviteHistory, isLoading: loadingHistory } = useInviteHistory();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
            <Check className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const renderPastInvite = (invite: PastEventInvite) => (
    <Card 
      key={invite.id} 
      className="card-rally cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
      onClick={() => navigate(`/events/${invite.event.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {invite.event.is_quick_rally && (
                <Badge variant="secondary" className="text-xs">Quick Rally</Badge>
              )}
              {invite.event.is_barhop && (
                <Badge variant="secondary" className="text-xs">Bar Hop</Badge>
              )}
            </div>
            <h3 className="font-semibold">{invite.event.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(invite.event.start_time), 'MMM d, yyyy • h:mm a')}
            </div>
            {invite.event.location_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {invite.event.location_name}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={invite.inviter.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {invite.inviter.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                Invited by {invite.inviter.display_name || 'Someone'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(invite.status)}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderInviteHistoryEntry = (entry: InviteHistoryEntry) => (
    <Card key={entry.id} className="card-rally">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                {entry.profile?.display_name?.charAt(0) || 
                 entry.invited_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {entry.profile?.display_name || entry.invited_name || 'Unknown'}
              </p>
              <div className="flex items-center gap-2">
                {entry.invited_phone && (
                  <p className="text-xs text-muted-foreground">{entry.invited_phone}</p>
                )}
                {entry.invited_profile_id && (
                  <Badge variant="secondary" className="text-xs py-0">R@lly User</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="gap-1">
              <History className="h-3 w-3" />
              {entry.invite_count}x
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(entry.last_invited_at), 'MMM d')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20">
      <Header title="Invite History" />

      <main className="container py-6">
        <Tabs defaultValue="received" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <Calendar className="h-4 w-4" />
              Received
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Users className="h-4 w-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loadingPastInvites ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pastInvites && pastInvites.length > 0 ? (
                <div className="space-y-3 pr-4">
                  {pastInvites.map(renderPastInvite)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No past invites</p>
                  <p className="text-sm text-muted-foreground">
                    Your event invite history will appear here
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sent">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : inviteHistory && inviteHistory.length > 0 ? (
                <div className="space-y-3 pr-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    People you've invited before - tap to quickly re-invite
                  </p>
                  {inviteHistory.map(renderInviteHistoryEntry)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No invite history</p>
                  <p className="text-sm text-muted-foreground">
                    People you invite will appear here for quick re-invites
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
