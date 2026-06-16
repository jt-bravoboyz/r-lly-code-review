import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  inviteCount: number;
  attendeeProfileIds: string[];
  currentProfileId?: string | null;
}

/**
 * Host-only controls (status='scheduled'):
 *  - Cancel: when invites exist. Sets status='cancelled' + notifies invitees.
 *  - Delete: only when zero invites (accidental creation). Hard delete.
 */
export function CancelDeleteEventControls({
  eventId,
  eventTitle,
  inviteCount,
  attendeeProfileIds,
  currentProfileId,
}: Props) {
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const showCancel = inviteCount > 0;
  const showDelete = !showCancel; // mutually exclusive per spec

  const handleCancel = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled' } as any)
        .eq('id', eventId);
      if (error) throw error;

      // Notify invitees — best effort
      const targets = attendeeProfileIds.filter((id) => id && id !== currentProfileId);
      if (targets.length > 0) {
        try {
          await supabase.functions.invoke('send-event-notification', {
            body: {
              type: 'event_cancelled',
              eventId,
              eventTitle,
              title: `${eventTitle} cancelled`,
              body: `${eventTitle} has been cancelled by the host.`,
              targetProfileIds: targets,
              data: { kind: 'cancelled' },
            },
          });
        } catch (notifyErr) {
          console.error('Cancel notify failed:', notifyErr);
        }
      }

      toast.success('R@lly cancelled — your crew was notified');
      setConfirmCancel(false);
      navigate('/events');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel R@lly');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      toast.success('R@lly deleted');
      setConfirmDelete(false);
      navigate('/events');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete R@lly');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 pt-1">
      {showCancel && (
        <Button
          variant="outline"
          className="w-full border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive font-montserrat"
          onClick={() => setConfirmCancel(true)}
        >
          Cancel Event
        </Button>
      )}
      {showDelete && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
          onClick={() => setConfirmDelete(true)}
        >
          Delete event
        </button>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this R@lly?</AlertDialogTitle>
            <AlertDialogDescription>
              All invited guests will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep R@lly</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'Cancelling…' : 'Cancel R@lly'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this R@lly?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep R@lly</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'Deleting…' : 'Delete R@lly'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
