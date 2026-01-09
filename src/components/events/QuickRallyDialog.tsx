import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, MapPin, Copy, Share2, Users, Beer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useCreateEvent, useJoinEvent } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useSquads, Squad } from '@/hooks/useSquads';
import { useLocation } from '@/hooks/useLocation';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const quickRallySchema = z.object({
  title: z.string().min(1, 'Give your rally a name'),
  location_name: z.string().optional(),
  is_barhop: z.boolean(),
});

type QuickRallyFormData = z.infer<typeof quickRallySchema>;

interface QuickRallyDialogProps {
  trigger?: React.ReactNode;
  preselectedSquad?: Squad;
}

export function QuickRallyDialog({ trigger, preselectedSquad }: QuickRallyDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'create' | 'invite'>('create');
  const [createdEvent, setCreatedEvent] = useState<{ id: string; invite_code: string; title: string } | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(preselectedSquad || null);
  
  const { profile } = useAuth();
  const { data: squads } = useSquads();
  const { location, getCurrentLocation } = useLocation();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const navigate = useNavigate();

  const form = useForm<QuickRallyFormData>({
    resolver: zodResolver(quickRallySchema),
    defaultValues: {
      title: '',
      location_name: '',
      is_barhop: false,
    }
  });

  // Get current location on dialog open
  useEffect(() => {
    if (open) {
      getCurrentLocation();
    }
  }, [open, getCurrentLocation]);

  const onSubmit = async (data: QuickRallyFormData) => {
    if (!profile) {
      toast.error('You must be logged in to create a rally');
      return;
    }

    try {
      // Create rally starting now
      const result = await createEvent.mutateAsync({
        creator_id: profile.id,
        title: data.title,
        description: 'Quick Rally - Same day event',
        event_type: 'rally',
        start_time: new Date().toISOString(),
        location_name: data.location_name || 'Current Location',
        location_lat: location.lat,
        location_lng: location.lng,
        is_barhop: data.is_barhop,
        is_quick_rally: true,
      });

      // Auto-join the event
      await joinEvent.mutateAsync({ eventId: result.id, profileId: profile.id });

      setCreatedEvent({
        id: result.id,
        invite_code: result.invite_code || '',
        title: result.title
      });
      setStep('invite');
      toast.success('Quick Rally started! 🎉');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rally');
    }
  };

  const shareLink = createdEvent 
    ? `${window.location.origin}/join/${createdEvent.invite_code}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my R@lly: ${createdEvent?.title}`,
          text: `Join my Quick Rally! Use code: ${createdEvent?.invite_code}`,
          url: shareLink,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleGoToRally = () => {
    setOpen(false);
    if (createdEvent) {
      navigate(`/events/${createdEvent.id}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('create');
    setCreatedEvent(null);
    setSelectedSquad(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md font-montserrat font-bold">
            <Zap className="h-4 w-4 mr-2" />
            Quick R@lly
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === 'create' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-montserrat">
                <Zap className="h-5 w-5 text-secondary" />
                Quick R@lly
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's the move?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Drinks at Main St, Game Night..." 
                          {...field} 
                          className="text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where at?</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-9" 
                            placeholder="Location (optional)" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_barhop"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Beer className="h-5 w-5 text-secondary" />
                        <div>
                          <FormLabel className="text-base">Bar Hop Mode</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Multiple stops tonight
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Squad Selection */}
                {squads && squads.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Invite a Squad (optional)</FormLabel>
                    <ScrollArea className="h-24">
                      <div className="flex gap-2 pb-2">
                        {squads.map((squad) => (
                          <button
                            key={squad.id}
                            type="button"
                            onClick={() => setSelectedSquad(selectedSquad?.id === squad.id ? null : squad)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
                              selectedSquad?.id === squad.id 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <Users className="h-3 w-3" />
                            <span className="text-sm font-medium">{squad.name}</span>
                            {selectedSquad?.id === squad.id && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  disabled={createEvent.isPending}
                >
                  {createEvent.isPending ? 'Starting...' : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Rally Now
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-montserrat text-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
                Rally Started!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Invite Code Display */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Share this code with your squad</p>
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-3xl font-bold tracking-widest font-montserrat text-primary">
                    {createdEvent?.invite_code}
                  </p>
                </div>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button 
                  className="flex items-center gap-2 bg-primary"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Selected Squad Preview */}
              {selectedSquad && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Inviting {selectedSquad.name}
                  </p>
                  <div className="flex -space-x-2">
                    {selectedSquad.members?.slice(0, 5).map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.profile?.display_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {selectedSquad.members && selectedSquad.members.length > 5 && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                        +{selectedSquad.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                className="w-full gradient-primary"
                onClick={handleGoToRally}
              >
                Go to Rally
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}