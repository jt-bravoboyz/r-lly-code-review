import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X, Crown, Check } from 'lucide-react';
import { useCohosts, useAddCohost, useRemoveCohost } from '@/hooks/useCohosts';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface AddCohostDialogProps {
  eventId: string;
  creatorId: string;
  attendees: Attendee[];
}

export function AddCohostDialog({ eventId, creatorId, attendees }: AddCohostDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: cohosts } = useCohosts(eventId);
  const addCohost = useAddCohost();
  const removeCohost = useRemoveCohost();

  const cohostIds = new Set(cohosts?.map(c => c.profile_id) || []);

  const handleToggleCohost = async (profileId: string) => {
    if (cohostIds.has(profileId)) {
      try {
        await removeCohost.mutateAsync({ eventId, profileId });
        toast.success('Co-host removed');
      } catch (error: any) {
        toast.error(error.message || 'Failed to remove co-host');
      }
    } else {
      try {
        await addCohost.mutateAsync({ eventId, profileId });
        toast.success('Co-host added! They can now manage this rally.');
      } catch (error: any) {
        toast.error(error.message || 'Failed to add co-host');
      }
    }
  };

  // Filter out the creator from the list
  const eligibleAttendees = attendees.filter(a => a.profile?.id !== creatorId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Manage Co-hosts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-secondary" />
            Manage Co-hosts
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Co-hosts can edit rally details, add bar hop stops, and manage the event alongside you.
          </p>

          {/* Current cohosts */}
          {cohosts && cohosts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Co-hosts</p>
              <div className="space-y-2">
                {cohosts.map((cohost) => (
                  <div 
                    key={cohost.id}
                    className="flex items-center justify-between p-2 bg-secondary/10 rounded-lg border border-secondary/20"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={cohost.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                          {cohost.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{cohost.profile?.display_name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-1" />
                        Co-host
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleToggleCohost(cohost.profile_id)}
                      disabled={removeCohost.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendees to add */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Add from Attendees</p>
            {eligibleAttendees.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {eligibleAttendees.map((attendee) => {
                  const isCohost = cohostIds.has(attendee.profile?.id || '');
                  return (
                    <div 
                      key={attendee.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        isCohost 
                          ? 'bg-secondary/10 border-secondary/20' 
                          : 'bg-muted/50 border-transparent hover:bg-muted'
                      }`}
                      onClick={() => attendee.profile?.id && handleToggleCohost(attendee.profile.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee.profile?.display_name}</span>
                      </div>
                      {isCohost && (
                        <Check className="h-4 w-4 text-secondary" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other attendees yet. Invite people to add co-hosts.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
