import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useUpdateEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditEventDetailsDialogProps {
  eventId: string;
  currentTitle: string;
  currentDescription?: string | null;
}

export function EditEventDetailsDialog({
  eventId,
  currentTitle,
  currentDescription,
}: EditEventDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription ?? '');
  const updateEvent = useUpdateEvent();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTitle(currentTitle);
      setDescription(currentDescription ?? '');
    }
  };

  const trimmed = title.trim();
  const error =
    trimmed.length < 3
      ? 'Title must be at least 3 characters'
      : trimmed.length > 100
        ? 'Title is too long'
        : null;

  const handleSave = async () => {
    if (error) return;
    try {
      await updateEvent.mutateAsync({
        eventId,
        updates: {
          title: trimmed,
          description: description.trim() ? description.trim() : null,
        },
      });

      // Rebake share preview image — best-effort
      try {
        await supabase.functions.invoke('render-event-og-image', {
          body: { eventId },
        });
      } catch (ogErr) {
        console.error('Failed to rebake OG image:', ogErr);
      }

      toast.success('✨ R@lly details updated');
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update R@lly');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1"
          aria-label="Edit event details"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit R@lly Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rally-title">Title</Label>
            <Input
              id="rally-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Saturday Night Rally"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rally-description">Description (optional)</Label>
            <Textarea
              id="rally-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the plan?"
              className="min-h-[100px]"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!!error || updateEvent.isPending}
              className="gradient-primary"
            >
              {updateEvent.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
