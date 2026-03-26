import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RallyFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

export function RallyFeedbackModal({ open, onClose, eventId }: RallyFeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('event_feedback').insert({
        event_id: eventId,
        user_id: user.id,
        rating,
        feedback_text: text.trim() || null,
      });
      if (error) throw error;
      toast.success('Thanks for your feedback!');
      onClose();
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">How was this R@lly?</DialogTitle>
          <DialogDescription className="text-center">
            Quick feedback helps us improve
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hovered || rating)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Text */}
          <Textarea
            placeholder="What would make this better? (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? 'Sending...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
