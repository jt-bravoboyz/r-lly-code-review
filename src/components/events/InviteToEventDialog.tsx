import { useState, useMemo } from 'react';
import { getPublicName } from '@/lib/identity';
import { buildRallyShareUrl } from '@/lib/shareUrls';

import {
  UserPlus,
  Users,
  Copy,
  Share2,
  Check,
  MessageSquare,
  Send,
  Phone,
  History,
  Search,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Squad, useAllMySquads } from '@/hooks/useSquads';
import { useCreateEventInvites, useEventInvites } from '@/hooks/useEventInvites';
import { useCreatePhoneInvite, openSMSInvite, useEventPhoneInvites } from '@/hooks/usePhoneInvites';
import { useRecordInvite, useInviteHistory } from '@/hooks/useInviteHistory';
import { useRallyFriends, type RallyFriend } from '@/hooks/useRallyFriends';
import { PhoneInviteInput } from '@/components/contacts/PhoneInviteInput';
import { ContactSyncButton } from '@/components/contacts/ContactSyncButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  trigger,
}: InviteToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(new Set());
  const [invitingSquads, setInvitingSquads] = useState<Set<string>>(new Set());
  const [invitedSquads, setInvitedSquads] = useState<Set<string>>(new Set());
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [isBulkInviting, setIsBulkInviting] = useState(false);
  const [bulkBurst, setBulkBurst] = useState(false);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: friends } = useRallyFriends();
  const { data: squads } = useAllMySquads();
  const { data: eventInvites } = useEventInvites(eventId);
  const { data: phoneInvites } = useEventPhoneInvites(eventId);
  const { data: inviteHistory } = useInviteHistory();
  const createInvites = useCreateEventInvites();
  const createPhoneInvite = useCreatePhoneInvite();
  const recordInvite = useRecordInvite();

  const alreadyInvitedOrAttending = useMemo(
    () =>
      new Set([
        ...existingAttendeeIds,
        ...existingInviteIds,
        ...(eventInvites?.map((i) => i.invited_profile_id) || []),
      ]),
    [existingAttendeeIds, existingInviteIds, eventInvites]
  );

  const shareLink = profile?.id
    ? `${PUBLIC_APP_URL}/join/${inviteCode}?r=${profile.id}`
    : `${PUBLIC_APP_URL}/join/${inviteCode}`;

  const smsPreview = `You're in. ${eventTitle} — Tap to join the crew: ${shareLink}`;

  // Influence threshold: 10+ unique invites in history
  const isTopInviter = (inviteHistory?.length || 0) >= 10;

  // Recently invited profile IDs (last 8 from history) → "Suggested"
  const recentlyInvitedIds = useMemo(() => {
    const ids = new Set<string>();
    (inviteHistory || [])
      .filter((h) => !!h.invited_profile_id)
      .slice(0, 8)
      .forEach((h) => h.invited_profile_id && ids.add(h.invited_profile_id));
    return ids;
  }, [inviteHistory]);

  // Filter, exclude already-attending/invited
  const visibleFriends = useMemo(() => {
    const list = (friends || []).filter((f) => !alreadyInvitedOrAttending.has(f.id));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((f) => (f.display_name || '').toLowerCase().includes(q));
  }, [friends, alreadyInvitedOrAttending, searchQuery]);

  const suggestedFriends = useMemo(
    () => visibleFriends.filter((f) => recentlyInvitedIds.has(f.id) || f.isReferral),
    [visibleFriends, recentlyInvitedIds]
  );
  const otherFriends = useMemo(
    () => visibleFriends.filter((f) => !suggestedFriends.includes(f)),
    [visibleFriends, suggestedFriends]
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode || '');
    setCopiedCode(true);
    toast.success('Code copied!');
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${eventTitle}`,
          text: `You're invited to ${eventTitle} — Tap to join the crew`,
          url: shareLink,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleInviteSquad = async (squad: Squad) => {
    const profilesToInvite: string[] = [];
    if (
      squad.owner_id &&
      squad.owner_id !== profile?.id &&
      !alreadyInvitedOrAttending.has(squad.owner_id)
    ) {
      profilesToInvite.push(squad.owner_id);
    }
    if (squad.members) {
      for (const member of squad.members) {
        const memberId = member.profile_id || member.profile?.id;
        if (
          memberId &&
          !alreadyInvitedOrAttending.has(memberId) &&
          !profilesToInvite.includes(memberId)
        ) {
          profilesToInvite.push(memberId);
        }
      }
    }

    if (profilesToInvite.length === 0) {
      toast.info('All squad members are already in!');
      setInvitedSquads((prev) => new Set([...prev, squad.id]));
      return;
    }

    setInvitingSquads((prev) => new Set([...prev, squad.id]));
    try {
      await createInvites.mutateAsync({ eventId, profileIds: profilesToInvite, eventTitle });
      for (const profileId of profilesToInvite) {
        const member = squad.members?.find(
          (m) => (m.profile_id || m.profile?.id) === profileId
        );
        await recordInvite.mutateAsync({
          profileId,
          name: member?.profile?.display_name || undefined,
        });
      }
      setInvitedSquads((prev) => new Set([...prev, squad.id]));
      toast.success(
        `Invited ${profilesToInvite.length} from ${squad.name}!`
      );
    } catch (err: any) {
      if (err.message?.includes('already been invited')) {
        setInvitedSquads((prev) => new Set([...prev, squad.id]));
        toast.info('Some members were already invited');
      } else {
        toast.error('Failed to send invites');
      }
    } finally {
      setInvitingSquads((prev) => {
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
      openSMSInvite(phone, eventTitle, inviteCode);
      toast.success(`SMS opened for ${name || phone}!`);
    } catch (err: any) {
      if (err.message?.includes('Already invited')) {
        toast.info('Already invited this number');
        openSMSInvite(phone, eventTitle, inviteCode);
      } else {
        toast.error(err.message || 'Failed to create invite');
      }
    }
  };

  const toggleSelectFriend = (id: string) => {
    if (invitedFriendIds.has(id) || isBulkInviting) return;
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSuggestedSelected =
    suggestedFriends.length > 0 &&
    suggestedFriends.every((f) => selectedFriendIds.has(f.id) || invitedFriendIds.has(f.id));

  const toggleSelectAllSuggested = () => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (allSuggestedSelected) {
        suggestedFriends.forEach((f) => next.delete(f.id));
      } else {
        suggestedFriends.forEach((f) => {
          if (!invitedFriendIds.has(f.id)) next.add(f.id);
        });
      }
      return next;
    });
  };

  const handleBulkInvite = async () => {
    const ids = Array.from(selectedFriendIds);
    if (ids.length === 0) return;
    setIsBulkInviting(true);
    setFadingOutIds(new Set(ids));
    try {
      await createInvites.mutateAsync({ eventId, profileIds: ids, eventTitle });
      const friendMap = new Map((friends || []).map((f) => [f.id, f]));
      await Promise.all(
        ids.map((id) =>
          recordInvite.mutateAsync({
            profileId: id,
            name: friendMap.get(id)?.display_name || undefined,
          })
        )
      );
      setBulkBurst(true);
      setTimeout(() => {
        setInvitedFriendIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        setSelectedFriendIds(new Set());
        setFadingOutIds(new Set());
        setBulkBurst(false);
      }, 350);
      toast.success(`Invited ${ids.length} friend${ids.length === 1 ? '' : 's'} to the R@lly`);
    } catch (err: any) {
      if (err.message?.includes('already been invited')) {
        setInvitedFriendIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        setSelectedFriendIds(new Set());
        setFadingOutIds(new Set());
        toast.info('Some were already invited');
      } else {
        setFadingOutIds(new Set());
        toast.error(err.message || 'Failed to send invites');
      }
    } finally {
      setIsBulkInviting(false);
    }
  };

  const renderFriendRow = (f: RallyFriend) => {
    const isInvited = invitedFriendIds.has(f.id);
    const isSelected = selectedFriendIds.has(f.id);
    const isFading = fadingOutIds.has(f.id);
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => toggleSelectFriend(f.id)}
        disabled={isInvited || isBulkInviting}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border bg-card text-left transition-all duration-200',
          isSelected && 'bg-primary/[0.06] ring-1 ring-primary/30 border-primary/30',
          !isSelected && !isInvited && 'hover:bg-accent/40',
          isInvited && 'opacity-60',
          isFading && 'animate-fade-out'
        )}
      >
        {/* Checkbox indicator */}
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
            isSelected
              ? 'bg-primary border-primary'
              : isInvited
              ? 'bg-muted border-muted-foreground/30'
              : 'border-muted-foreground/40'
          )}
        >
          {(isSelected || isInvited) && (
            <Check
              className={cn(
                'h-3 w-3',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            />
          )}
        </div>

        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={f.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/15 text-primary text-sm">
            {(f.display_name || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {f.display_name || 'R@lly Friend'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {f.isSquadMate ? 'Squad Mate' : f.isReferral ? 'Your Referral' : 'R@lly Friend'}
          </p>
        </div>

        {isInvited && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            Invited
          </span>
        )}
      </button>
    );
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-montserrat">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to R@lly
          </DialogTitle>
        </DialogHeader>

        {/* Premium Share Header */}
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent backdrop-blur-xl p-3 mt-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Invite Code
              </p>
              <p className="text-lg font-bold font-montserrat tabular-nums tracking-widest text-foreground truncate">
                {inviteCode || '—'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCopyCode}
              className={cn(
                'gap-1 transition-all duration-300',
                copiedCode
                  ? 'bg-primary text-primary-foreground hover:bg-primary'
                  : 'bg-background text-foreground hover:bg-accent border border-border'
              )}
            >
              {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="sm"
              onClick={handleShare}
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>

        <Tabs defaultValue="friends" className="mt-3 flex-1 min-h-0 flex flex-col">
          {/* Segmented pill tabs */}
          <TabsList className="w-full rounded-full bg-muted/70 p-1 h-auto">
            <TabsTrigger
              value="friends"
              className="flex-1 rounded-full gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              On R@lly
            </TabsTrigger>
            <TabsTrigger
              value="squads"
              className="flex-1 rounded-full gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Users className="h-3.5 w-3.5" />
              Squads
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="flex-1 rounded-full gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Text
            </TabsTrigger>
          </TabsList>

          {/* On R@lly */}
          <TabsContent value="friends" className="mt-4 flex-1 min-h-0 flex flex-col">
            <div className="relative mb-3">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search friends…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="relative flex-1 min-h-0">
              <ScrollArea className={cn('h-[280px] pr-3', selectedFriendIds.size > 0 && 'pb-14')}>
                {visibleFriends.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="font-medium text-sm">
                      {searchQuery ? 'No friends match' : 'No friends to invite'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use Text or Share to bring more people in
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestedFriends.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Suggested
                            </p>
                            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {suggestedFriends.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={toggleSelectAllSuggested}
                            disabled={isBulkInviting}
                            className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                          >
                            {allSuggestedSelected ? 'Clear' : 'Select all'}
                          </button>
                        </div>
                        <div className="space-y-2">{suggestedFriends.map(renderFriendRow)}</div>
                      </div>
                    )}
                    {otherFriends.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            All Friends
                          </p>
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {otherFriends.length}
                          </span>
                        </div>
                        <div className="space-y-2">{otherFriends.map(renderFriendRow)}</div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Floating Bulk Action */}
              {selectedFriendIds.size > 0 && (
                <div className="absolute bottom-0 left-0 right-2 animate-fade-in">
                  <div className="bg-gradient-to-t from-background via-background to-transparent pt-4 pb-1">
                    <Button
                      onClick={handleBulkInvite}
                      disabled={isBulkInviting}
                      className={cn(
                        'w-full rounded-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300',
                        bulkBurst && 'animate-scale-in'
                      )}
                    >
                      {bulkBurst ? (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Invited {selectedFriendIds.size} <span className="tabular-nums">friend{selectedFriendIds.size === 1 ? '' : 's'}</span>
                        </>
                      ) : isBulkInviting ? (
                        <>Sending…</>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Invite Selected (<span className="tabular-nums">{selectedFriendIds.size}</span>)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Squads */}
          <TabsContent value="squads" className="mt-4 flex-1 min-h-0">
            {squads && squads.length > 0 ? (
              <ScrollArea className="h-[320px] pr-3">
                <div className="space-y-2">
                  {squads.map((squad) => {
                    const isInvited = invitedSquads.has(squad.id);
                    const isSending = invitingSquads.has(squad.id);
                    const memberCount = squad.members?.length || 0;
                    const attendingCount =
                      squad.members?.filter(
                        (m) => m.profile?.id && existingAttendeeIds.includes(m.profile.id)
                      ).length || 0;

                    return (
                      <div
                        key={squad.id}
                        className="flex items-center justify-between p-3 rounded-xl border bg-card transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{squad.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {attendingCount > 0
                                ? `${attendingCount}/${memberCount} already in rally`
                                : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isInvited ? 'ghost' : 'outline'}
                          onClick={() => !isInvited && handleInviteSquad(squad)}
                          disabled={isSending || isInvited}
                          className={cn(
                            'gap-1 transition-all duration-300 shrink-0',
                            isInvited && 'text-primary hover:text-primary'
                          )}
                        >
                          {isInvited ? (
                            <>
                              <Check className="h-3 w-3" />
                              Invited
                            </>
                          ) : isSending ? (
                            'Sending…'
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Invite
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10 space-y-3">
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

          {/* Text Invite */}
          <TabsContent value="text" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-4">
                {/* SMS Preview */}
                <div className="rounded-xl bg-muted/60 border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    SMS Preview
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {smsPreview}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Send to a number</p>
                  <PhoneInviteInput
                    onInvite={handlePhoneInvite}
                    isLoading={createPhoneInvite.isPending}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Pull from Contacts</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Faster than typing
                    </p>
                  </div>
                  <ContactSyncButton />
                </div>

                {phoneInvites && phoneInvites.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Recently Texted
                      </p>
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {Math.min(phoneInvites.length, 5)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {phoneInvites.slice(0, 5).map((pi) => (
                        <div
                          key={pi.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border bg-card"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {pi.display_name || pi.phone_number}
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {pi.phone_number}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {pi.status === 'joined' ? 'Joined' : 'Sent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => {
              setOpen(false);
              navigate('/invite-history');
            }}
          >
            <History className="h-4 w-4" />
            History
          </Button>
          {isTopInviter && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/[0.06] text-primary text-[11px] font-semibold transition-all duration-300">
              <Crown className="h-3 w-3" />
              Influence
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
