import { useState } from 'react';
import { MoreVertical, UserMinus, Crown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  eventId: string;
  eventTitle: string;
  hostName: string;
  attendeeProfileId: string;
  attendeeName: string;
  onRemoved?: () => void;
  onPromoted?: () => void;
}

/**
 * Host-only ⋯ menu shown next to attendee avatars.
 * Actions: Remove from event, Make cohost.
 */
export function AttendeeRowMenu({
  eventId,
  eventTitle,
  hostName,
  attendeeProfileId,
  attendeeName,
  onRemoved,
  onPromoted,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleRemove = async () => {
    setBusy(true);
    try {
      // Mark attendee row as removed
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'removed' } as any)
        .eq('event_id', eventId)
        .eq('profile_id', attendeeProfileId);
      if (error) throw error;

      // Drop any ride passenger row for this user in this event
      try {
        await (supabase as any)
          .from('ride_passengers')
          .delete()
          .eq('event_id', eventId)
          .eq('passenger_profile_id', attendeeProfileId);
      } catch {
        /* schema variants — ignore */
      }

      // Notify the removed user — best effort
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            driverProfileIds: [attendeeProfileId],
            title: 'You were removed from a R@lly',
            body: `${hostName} has removed you from ${eventTitle}`,
            data: { type: 'event_removed', event_id: eventId },
            tag: `event-removed-${eventId}-${attendeeProfileId}`,
          },
        });
      } catch (pushErr) {
        console.error('Removal push failed:', pushErr);
      }

      toast.success(`Removed ${attendeeName}`);
      setConfirmRemove(false);
      onRemoved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove attendee');
    } finally {
      setBusy(false);
    }
  };

  const handleMakeCohost = async () => {
    try {
      const { error } = await (supabase as any)
        .from('event_cohosts')
        .insert({ event_id: eventId, profile_id: attendeeProfileId });
      if (error && error.code !== '23505') throw error;
      toast.success(`${attendeeName} is now a cohost 👑`);
      onPromoted?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add cohost');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-background/90 border border-border/60 flex items-center justify-center hover:bg-background"
          aria-label={`Manage ${attendeeName}`}
        >
          <MoreVertical className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={handleMakeCohost}>
            <Crown className="h-4 w-4 mr-2" />
            Make cohost
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirmRemove(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remove from event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {attendeeName} from this event?</AlertDialogTitle>
            <AlertDialogDescription>They will be notified.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
