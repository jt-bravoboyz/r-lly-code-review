import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUpdateEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditEventTimeDialogProps {
  eventId: string;
  eventTitle: string;
  currentStartTime: string;
  currentEndTime?: string | null;
  attendeeProfileIds: string[];
  currentProfileId?: string | null;
}

// Convert ISO -> "yyyy-MM-ddTHH:mm" (local) for datetime-local input
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

// "yyyy-MM-ddTHH:mm" (local) -> ISO
function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function EditEventTimeDialog({
  eventId,
  eventTitle,
  currentStartTime,
  currentEndTime,
  attendeeProfileIds,
  currentProfileId,
}: EditEventTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [startLocal, setStartLocal] = useState(isoToLocalInput(currentStartTime));
  const [endLocal, setEndLocal] = useState(currentEndTime ? isoToLocalInput(currentEndTime) : '');
  const [showEnd, setShowEnd] = useState(!!currentEndTime);
  const updateEvent = useUpdateEvent();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setStartLocal(isoToLocalInput(currentStartTime));
      setEndLocal(currentEndTime ? isoToLocalInput(currentEndTime) : '');
      setShowEnd(!!currentEndTime);
    }
  };

  const startDate = startLocal ? new Date(startLocal) : null;
  const endDate = showEnd && endLocal ? new Date(endLocal) : null;
  const now = new Date();

  let error: string | null = null;
  if (!startDate || isNaN(startDate.getTime())) error = 'Pick a start time';
  else if (startDate <= now) error = 'Start must be in the future';
  else if (endDate && (isNaN(endDate.getTime()) || endDate <= startDate)) error = 'End must be after start';

  const handleSave = async () => {
    if (error || !startDate) return;
    const newStartIso = localInputToIso(startLocal);
    const newEndIso = endDate ? localInputToIso(endLocal) : null;

    try {
      await updateEvent.mutateAsync({
        eventId,
        updates: {
          start_time: newStartIso,
          end_time: newEndIso,
        },
      });

      // Notify attendees (best-effort; don't block the toast on failure)
      const targets = attendeeProfileIds.filter((id) => id && id !== currentProfileId);
      if (targets.length > 0) {
        try {
          await supabase.functions.invoke('send-event-notification', {
            body: {
              type: 'event_update',
              eventId,
              eventTitle,
              title: `🕒 ${eventTitle} — new time`,
              body: `New start: ${format(startDate, 'EEE MMM d · h:mm a')}`,
              targetProfileIds: targets,
              data: {
                kind: 'time_change',
                start_time: newStartIso,
                end_time: newEndIso,
              },
            },
          });
        } catch (notifyErr) {
          console.error('Time-change notify failed:', notifyErr);
        }
      }

      toast.success('🕒 Time updated — your crew was notified');
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update time');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
          <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rally-start-time">Start time</Label>
            <Input
              id="rally-start-time"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>

          {showEnd ? (
            <div className="space-y-2">
              <Label htmlFor="rally-end-time">End time</Label>
              <Input
                id="rally-end-time"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setShowEnd(false); setEndLocal(''); }}
              >
                Remove end time
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowEnd(true)}
            >
              + Add end time
            </button>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Your crew gets a heads-up notification when you save.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!!error || updateEvent.isPending}
              className="gradient-primary"
            >
              {updateEvent.isPending ? 'Saving...' : 'Save Time'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
