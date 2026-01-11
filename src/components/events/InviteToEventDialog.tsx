import { useState } from 'react';
import { UserPlus, Users, Copy, Share2, Check, Link2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSquads, Squad } from '@/hooks/useSquads';
import { useJoinEvent } from '@/hooks/useEvents';
import { toast } from 'sonner';

interface InviteToEventDialogProps {
  eventId: string;
  eventTitle: string;
  inviteCode: string | null;
  existingAttendeeIds: string[];
  trigger?: React.ReactNode;
}

export function InviteToEventDialog({ 
  eventId, 
  eventTitle, 
  inviteCode, 
  existingAttendeeIds,
  trigger 
}: InviteToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [invitingSquads, setInvitingSquads] = useState<Set<string>>(new Set());
  const [invitedSquads, setInvitedSquads] = useState<Set<string>>(new Set());
  
  const { data: squads } = useSquads();
  const joinEvent = useJoinEvent();

  const shareLink = `${window.location.origin}/join/${inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Invite link copied!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode || '');
    toast.success('Invite code copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${eventTitle}`,
          text: `Join my R@lly! Use code: ${inviteCode}`,
          url: shareLink,
        });
      } catch (err) {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleInviteSquad = async (squad: Squad) => {
    if (!squad.members || squad.members.length === 0) {
      toast.error('This squad has no members');
      return;
    }

    // Get members who aren't already attending
    const membersToInvite = squad.members.filter(
      member => member.profile?.id && !existingAttendeeIds.includes(member.profile.id)
    );

    if (membersToInvite.length === 0) {
      toast.info('All squad members are already in this rally!');
      setInvitedSquads(prev => new Set([...prev, squad.id]));
      return;
    }

    setInvitingSquads(prev => new Set([...prev, squad.id]));

    try {
      // Add each member to the event
      await Promise.all(
        membersToInvite.map(member => 
          joinEvent.mutateAsync({ 
            eventId, 
            profileId: member.profile!.id 
          }).catch(err => {
            // Ignore duplicate errors
            if (!err.message?.includes('duplicate')) {
              throw err;
            }
          })
        )
      );

      setInvitedSquads(prev => new Set([...prev, squad.id]));
      toast.success(`Added ${membersToInvite.length} member${membersToInvite.length > 1 ? 's' : ''} from ${squad.name}!`);
    } catch (error: any) {
      toast.error('Failed to add some members');
    } finally {
      setInvitingSquads(prev => {
        const next = new Set(prev);
        next.delete(squad.id);
        return next;
      });
    }
  };

  const getSquadStatus = (squad: Squad) => {
    if (invitedSquads.has(squad.id)) return 'invited';
    if (invitingSquads.has(squad.id)) return 'inviting';
    
    // Check if all members are already attending
    const allAttending = squad.members?.every(
      member => member.profile?.id && existingAttendeeIds.includes(member.profile.id)
    );
    if (allAttending && squad.members && squad.members.length > 0) return 'all-attending';
    
    return 'available';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-montserrat">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to Rally
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="squads" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="squads" className="gap-2">
              <Users className="h-4 w-4" />
              My Squads
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Share Link
            </TabsTrigger>
          </TabsList>

          {/* Squads Tab - For existing R@lly users */}
          <TabsContent value="squads" className="space-y-4 mt-4">
            {squads && squads.length > 0 ? (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {squads.map((squad) => {
                    const status = getSquadStatus(squad);
                    const memberCount = squad.members?.length || 0;
                    const attendingCount = squad.members?.filter(
                      m => m.profile?.id && existingAttendeeIds.includes(m.profile.id)
                    ).length || 0;

                    return (
                      <div
                        key={squad.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{squad.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {attendingCount > 0 
                                ? `${attendingCount}/${memberCount} already in rally`
                                : `${memberCount} member${memberCount !== 1 ? 's' : ''}`
                              }
                            </p>
                          </div>
                        </div>

                        {status === 'invited' || status === 'all-attending' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            {status === 'all-attending' ? 'All In' : 'Invited'}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInviteSquad(squad)}
                            disabled={status === 'inviting'}
                          >
                            {status === 'inviting' ? 'Adding...' : 'Add All'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="font-medium">No squads yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a squad to quickly invite groups of friends
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Link Tab - For non-R@lly users */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Share this with friends who don't have R@lly yet
              </p>
            </div>

            {/* Invite Code Display */}
            <div className="bg-gradient-to-br from-primary/10 via-orange-100 to-yellow-50 dark:from-primary/20 dark:via-orange-900/20 dark:to-yellow-900/10 rounded-xl p-4 border-2 border-primary/20">
              <p className="text-xs text-center text-muted-foreground mb-2">Invite Code</p>
              <p className="text-3xl font-bold tracking-widest font-montserrat text-center bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {inviteCode || 'N/A'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
                Copy Code
              </Button>
              <Button 
                variant="outline"
                className="gap-2"
                onClick={handleCopyLink}
              >
                <Link2 className="h-4 w-4" />
                Copy Link
              </Button>
            </div>

            <Button 
              className="w-full gap-2 bg-primary"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share Invite
            </Button>

            {/* SMS/Message hint */}
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Tap share to send via text, WhatsApp, etc.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
