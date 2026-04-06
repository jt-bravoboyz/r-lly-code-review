import { useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface GoingRogueButtonProps {
  onGoRogue: (finalWords?: string) => Promise<any>;
  isPending: boolean;
}

export function GoingRogueButton({ onGoRogue, isPending }: GoingRogueButtonProps) {
  const [open, setOpen] = useState(false);
  const [finalWords, setFinalWords] = useState('');

  const handleConfirm = async () => {
    try {
      await onGoRogue(finalWords.trim() || undefined);
      toast.success("You've gone rogue! 🔥", { icon: '🔥' });
      setOpen(false);
      setFinalWords('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to go rogue');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-primary text-primary hover:bg-primary/10 font-montserrat font-bold transition-transform active:scale-[0.97]"
        onClick={() => setOpen(true)}
      >
        <Flame className="h-5 w-5 mr-2" />
        I'm Going Rogue 🔥
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Flame className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold font-montserrat">
              Going Rogue? 🔥
            </DialogTitle>
            <DialogDescription>
              Your whole crew will see this. Drop your final words.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Any last words? (optional)"
            value={finalWords}
            onChange={(e) => setFinalWords(e.target.value)}
            maxLength={280}
            className="resize-none"
            rows={3}
          />

          <div className="space-y-2 pt-2">
            <Button
              className="w-full gradient-primary font-montserrat font-bold transition-transform active:scale-[0.97]"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Going Rogue...' : 'Confirm — Go Rogue 🔥'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Nevermind
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
