import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

const feedbackTypes = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500' },
  { value: 'feature', label: 'Feature', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-blue-500' },
] as const;

export function FeedbackDialog() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('system_feedback' as any).insert({
        user_id: user.id,
        type,
        message: message.trim(),
        screen_path: location.pathname,
      });
      if (error) throw error;
      toast.success('Thanks for your feedback!');
      setMessage('');
      setType('bug');
      setOpen(false);
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
          <MessageSquare className="h-4 w-4 mr-2" />
          Report a Bug / Suggestion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Send Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Type</Label>
            <div className="flex gap-2">
              {feedbackTypes.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setType(ft.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    type === ft.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <ft.icon className={cn('h-4 w-4', type === ft.value ? '' : ft.color)} />
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="feedback-msg" className="text-sm font-medium mb-2 block">Message</Label>
            <Textarea
              id="feedback-msg"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="w-full"
          >
            {submitting ? 'Sending...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
