import { useState } from 'react';
import { UserPlus, Users, Copy, Share2, Check, Link2, MessageSquare, Send, Phone, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Squad, useAllMySquads } from '@/hooks/useSquads';
import { useCreateEventInvites, useEventInvites } from '@/hooks/useEventInvites';
import { useCreatePhoneInvite, openSMSInvite, useEventPhoneInvites } from '@/hooks/usePhoneInvites';
import { useRecordInvite } from '@/hooks/useInviteHistory';
import { ContactSelector } from '@/components/contacts/ContactSelector';
import { PhoneInviteInput } from '@/components/contacts/PhoneInviteInput';
import { ContactSyncButton } from '@/components/contacts/ContactSyncButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface InviteToEventDialogProps {
  eventId: string;
  eventTitle: string;
  inviteCode: string | null;
  existingAttendeeIds: string[];
  existingInviteIds?: string[];
  trigger?: React.ReactNode;
}

export function InviteToEventDialog({ 
  eventId, 
  eventTitle, 
  inviteCode, 
  existingAttendeeIds,
  existingInviteIds = [],
  trigger 
}: InviteToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [invitingSquads, setInvitingSquads] = useState<Set<string>>(new Set());
  const [invitedSquads, setInvitedSquads] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Use all squads (owned + member) for inviting
  const { data: squads } = useAllMySquads();
  const { data: eventInvites } = useEventInvites(eventId);
  const { data: phoneInvites } = useEventPhoneInvites(eventId);
  const createInvites = useCreateEventInvites();
  const createPhoneInvite = useCreatePhoneInvite();
  const recordInvite = useRecordInvite();

  // Combine existing attendees and pending invites
  const alreadyInvitedOrAttending = new Set([
    ...existingAttendeeIds,
    ...existingInviteIds,
    ...(eventInvites?.map(i => i.invited_profile_id) || [])
  ]);

  const alreadyInvitedPhones = new Set(
    phoneInvites?.map(pi => pi.phone_number) || []
  );

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
    // Collect all profile IDs to invite (members + owner if not current user)
    const profilesToInvite: string[] = [];

    // Add squad owner if not the current user and not already invited
    if (squad.owner_id && squad.owner_id !== profile?.id && !alreadyInvitedOrAttending.has(squad.owner_id)) {
      profilesToInvite.push(squad.owner_id);
    }

    // Add members who aren't already attending or invited
    // Use profile_id directly (with fallback to profile?.id for backwards compatibility)
    if (squad.members) {
      for (const member of squad.members) {
        const memberId = member.profile_id || member.profile?.id;
        if (memberId && !alreadyInvitedOrAttending.has(memberId) && !profilesToInvite.includes(memberId)) {
          profilesToInvite.push(memberId);
        }
      }
    }

    if (import.meta.env.DEV) console.log('[R@lly Debug] InviteToEventDialog squad invite:', {
      squad_id: squad.id,
      squad_name: squad.name,
      owner_id: squad.owner_id,
      current_user: profile?.id,
      members_to_invite: profilesToInvite
    });

    if (profilesToInvite.length === 0) {
      toast.info('All squad members are already invited or attending!');
      setInvitedSquads(prev => new Set([...prev, squad.id]));
      return;
    }

    setInvitingSquads(prev => new Set([...prev, squad.id]));

    try {
      await createInvites.mutateAsync({ 
        eventId, 
        profileIds: profilesToInvite,
        eventTitle
      });

      // Record in invite history
      for (const profileId of profilesToInvite) {
        const member = squad.members?.find(m => (m.profile_id || m.profile?.id) === profileId);
        await recordInvite.mutateAsync({
          profileId,
          name: member?.profile?.display_name || undefined,
        });
      }

      setInvitedSquads(prev => new Set([...prev, squad.id]));
      toast.success(`Invited ${profilesToInvite.length} member${profilesToInvite.length > 1 ? 's' : ''} from ${squad.name}!`);
    } catch (error: any) {
      if (error.message?.includes('already been invited')) {
        toast.info('Some members were already invited');
        setInvitedSquads(prev => new Set([...prev, squad.id]));
      } else {
        toast.error('Failed to send invites');
      }
    } finally {
      setInvitingSquads(prev => {
        const next = new Set(prev);
        next.delete(squad.id);
        return next;
      });
    }
  };

  const handlePhoneInvite = async (phone: string, name: string) => {
    if (!inviteCode) {
      toast.error('No invite code available');
      return;
    }

    try {
      await createPhoneInvite.mutateAsync({
        eventId,
        eventTitle,
        phoneNumber: phone,
        displayName: name,
        eventInviteCode: inviteCode,
      });

      // Open SMS with invite
      openSMSInvite(phone, eventTitle, inviteCode);
      toast.success(`SMS opened for ${name || phone}!`);
    } catch (error: any) {
      if (error.message?.includes('Already invited')) {
        toast.info('Already invited this number');
        // Still open SMS in case they want to resend
        openSMSInvite(phone, eventTitle, inviteCode!);
      } else {
        toast.error(error.message || 'Failed to create invite');
      }
    }
  };

  const handleContactSelect = async (contact: { 
    phone?: string; 
    profileId?: string; 
    name: string;
    isAppUser: boolean;
  }) => {
    if (contact.isAppUser && contact.profileId) {
      // Invite existing R@lly user
      try {
        await createInvites.mutateAsync({
          eventId,
          profileIds: [contact.profileId],
          eventTitle,
        });
        await recordInvite.mutateAsync({
          profileId: contact.profileId,
          name: contact.name,
        });
        toast.success(`Invited ${contact.name}!`);
      } catch (error: any) {
        toast.error(error.message || 'Failed to invite');
      }
    } else if (contact.phone) {
      // SMS invite for non-app user
      handlePhoneInvite(contact.phone, contact.name);
    }
  };

  const getSquadStatus = (squad: Squad) => {
    if (invitedSquads.has(squad.id)) return 'invited';
    if (invitingSquads.has(squad.id)) return 'inviting';
    
    // Check if all members AND owner are already attending or invited
    const ownerInvited = squad.owner_id === profile?.id || alreadyInvitedOrAttending.has(squad.owner_id);
    const allMembersInvited = squad.members?.every(member => {
      const memberId = member.profile_id || member.profile?.id;
      return memberId && alreadyInvitedOrAttending.has(memberId);
    });
    
    if (ownerInvited && allMembersInvited && (squad.members?.length || 0) >= 0) return 'all-invited';
    
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-montserrat">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to Rally
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contacts" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contacts" className="gap-1 text-xs">
              <Phone className="h-3 w-3" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="squads" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              Squads
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1 text-xs">
              <Link2 className="h-3 w-3" />
              Link
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Contacts Tab - Phone invites and contact list */}
          <TabsContent value="contacts" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Invite from contacts or enter a phone number
              </p>
              <ContactSyncButton />
            </div>

            <ContactSelector
              onSelectContact={handleContactSelect}
              existingInvitedPhones={Array.from(alreadyInvitedPhones)}
              existingInvitedProfileIds={Array.from(alreadyInvitedOrAttending)}
            />

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Or enter a new number:</p>
              <PhoneInviteInput
                onInvite={handlePhoneInvite}
                isLoading={createPhoneInvite.isPending}
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => {
                setOpen(false);
                navigate('/invite-history');
              }}
            >
              <History className="h-4 w-4" />
              View Invite History
            </Button>
          </TabsContent>

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

                        {status === 'invited' || status === 'all-invited' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            {status === 'all-invited' ? 'All Invited' : 'Invited'}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInviteSquad(squad)}
                            disabled={status === 'inviting'}
                            className="gap-1"
                          >
                            <Send className="h-3 w-3" />
                            {status === 'inviting' ? 'Sending...' : 'Invite'}
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

          {/* History Tab - Who was invited to this event */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              People invited to this rally
            </p>
            <ScrollArea className="h-[280px] pr-4">
              {(eventInvites && eventInvites.length > 0) || (phoneInvites && phoneInvites.length > 0) ? (
                <div className="space-y-2">
                  {/* App user invites */}
                  {eventInvites?.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={(invite as any).invited_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {(invite as any).invited_profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {(invite as any).invited_profile?.display_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invite.invited_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={invite.status === 'accepted' ? 'default' : invite.status === 'declined' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {invite.status === 'accepted' ? 'Joined' : invite.status === 'declined' ? 'Declined' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                  {/* Phone invites */}
                  {phoneInvites?.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            <Phone className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {invite.display_name || invite.phone_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SMS • {format(new Date(invite.invited_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={invite.status === 'joined' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {invite.status === 'joined' ? 'Joined' : invite.status === 'clicked' ? 'Clicked' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">No invites yet</p>
                    <p className="text-sm text-muted-foreground">
                      Invite people using Contacts, Squads, or share the link
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
