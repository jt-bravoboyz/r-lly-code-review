import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddBarHopStopDialogProps {
  eventId: string;
  currentStopCount: number;
}

export function AddBarHopStopDialog({ eventId, currentStopCount }: AddBarHopStopDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a stop name');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('barhop_stops')
        .insert({
          event_id: eventId,
          name: name.trim(),
          address: address.trim() || null,
          stop_order: currentStopCount + 1,
        });

      if (error) throw error;

      toast.success('Stop added! 🍺');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setName('');
      setAddress('');
      setOpen(false);
    } catch (error) {
      console.error('Error adding stop:', error);
      toast.error('Failed to add stop');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Stop
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" />
            Add Bar Hop Stop
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Stop Name *</Label>
            <Input
              id="name"
              placeholder="e.g., The Local Pub"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St, Austin TX"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary/90"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Stop'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
