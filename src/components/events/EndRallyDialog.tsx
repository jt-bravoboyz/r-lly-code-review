import { useState, useMemo } from 'react';
import { Moon, Home, CheckCircle, MapPin, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/location/LocationSearch';
import { useEvent } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useCohosts } from '@/hooks/useCohosts';
import { getPublicName } from '@/lib/identity';

interface EndRallyDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function EndRallyDialog({ eventId, open, onOpenChange, onCompleted }: EndRallyDialogProps) {
  const endRally = useEndRally();
  const completeRally = useCompleteRally();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: event } = useEvent(eventId);
  const { data: cohosts } = useCohosts(eventId);

  const [isLoading, setIsLoading] = useState(false);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id?: string;
  } | null>(null);
  const [showLocationError, setShowLocationError] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  // Build pickable attendee list (everyone except current user, host, cohosts — they're auto-invited)
  const cohostIds = useMemo(() => new Set((cohosts ?? []).map((c) => c.profile_id)), [cohosts]);
  const hostId = (event as any)?.creator?.id ?? (event as any)?.creator_id;
  const pickableAttendees = useMemo(() => {
    const list = ((event as any)?.attendees ?? []) as Array<{ profile?: { id: string; display_name?: string | null; avatar_url?: string | null } }>;
    return list
      .map((a) => a.profile)
      .filter((p): p is { id: string; display_name?: string | null; avatar_url?: string | null } => !!p?.id)
      .filter((p) => p.id !== hostId && !cohostIds.has(p.id) && p.id !== profile?.id);
  }, [event, cohostIds, hostId, profile?.id]);

  const toggleInvited = (id: string) => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAfterRally = async () => {
    if (!selectedLocation) {
      setShowLocationError(true);
      return;
    }

    setIsLoading(true);
    try {
      const displayName = selectedLocation.name;

      const { error: updateError } = await supabase
        .from('events')
        .update({
          after_rally_location_name: displayName,
          after_rally_location_lat: selectedLocation.lat,
          after_rally_location_lng: selectedLocation.lng,
          after_rally_stealth: stealthMode,
          after_rally_invited_ids: stealthMode ? Array.from(invitedIds) : [],
        } as any)
        .eq('id', eventId);

      if (updateError) throw updateError;

      await endRally.mutateAsync(eventId);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success(stealthMode ? 'Private After R@lly started 🤫' : 'After R@lly started! 🌙', {
        description: stealthMode
          ? `Only your hand-picked crew can see ${displayName}.`
          : `Location: ${displayName}`,
      });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start After R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRally = async () => {
    setIsLoading(true);
    try {
      await completeRally.mutateAsync(eventId);
      onOpenChange(false);
      onCompleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLocationSearchValue('');
    setSelectedLocation(null);
    setShowLocationError(false);
    setStealthMode(false);
    setInvitedIds(new Set());
  };

  const stealthDisabled = stealthMode && invitedIds.size === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <span>End R@lly</span>
          </DialogTitle>
          <DialogDescription>
            What would you like to do with this R@lly?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 w-full min-w-0">
          {/* After R@lly Option */}
          <div className="relative p-3 rounded-lg bg-[hsl(270,60%,20%)] space-y-3 w-full min-w-0 box-border after-rally-glow-border">
            <div className="flex items-start gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[hsl(270,60%,50%)]/20 flex items-center justify-center shrink-0">
                <Moon className="h-4 w-4 text-[hsl(270,60%,50%)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold font-montserrat text-sm text-white">Start After R@lly</div>
                <p className="text-xs text-gray-300">
                  Continue the night at a new spot!
                </p>
              </div>
            </div>

            {/* Single Location Field */}
            <div className="space-y-2 w-full overflow-visible relative z-10">
              <Label className="flex items-center gap-2 text-xs text-gray-200">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>After R@lly Spot</span>
                <span className="text-destructive shrink-0">*</span>
              </Label>
              <LocationSearch
                value={locationSearchValue}
                onChange={(v) => {
                  setLocationSearchValue(v);
                  setShowLocationError(false);
                  if (selectedLocation && v !== selectedLocation.name) {
                    setSelectedLocation(null);
                  }
                }}
                onLocationSelect={(loc) => {
                  setSelectedLocation(loc);
                  setShowLocationError(false);
                }}
                placeholder="Search an address"
                showMapPreview={false}
                allowCustomName={true}
              />
              {showLocationError && !selectedLocation && (
                <p className="text-xs text-destructive">
                  Add an address so the squad can map it.
                </p>
              )}
              {selectedLocation && (
                <p className="text-xs text-muted-foreground truncate">
                  📍 {selectedLocation.address}
                </p>
              )}
            </div>

            {/* Stealth Mode Toggle */}
            <div className="space-y-2 relative z-10 rounded-md bg-black/30 p-3 border border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <EyeOff className="h-4 w-4 text-white/80 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <Label htmlFor="stealth-mode" className="text-xs font-semibold text-white block">
                      Stealth Mode
                    </Label>
                    <p className="text-[11px] text-gray-400 leading-tight">
                      Only people you pick will see it. Everyone else thinks the R@lly ended.
                    </p>
                  </div>
                </div>
                <Switch
                  id="stealth-mode"
                  checked={stealthMode}
                  onCheckedChange={setStealthMode}
                />
              </div>

              {stealthMode && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs text-gray-200">
                      <Users className="h-3 w-3" />
                      Pick your crew
                    </Label>
                    <span className="text-[11px] text-gray-400">
                      {invitedIds.size} invited
                    </span>
                  </div>

                  {pickableAttendees.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2 text-center">
                      No other attendees to invite.
                    </p>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border border-white/10 bg-black/20">
                      <div className="p-1">
                        {pickableAttendees.map((p) => {
                          const isPicked = invitedIds.has(p.id);
                          const name = getPublicName(p as any);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleInvited(p.id)}
                              className={`w-full flex items-center gap-2 p-2 rounded-md transition-colors text-left min-h-[44px] ${
                                isPicked
                                  ? 'bg-[hsl(270,60%,50%)]/30 hover:bg-[hsl(270,60%,50%)]/40'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={p.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex-1 text-xs text-white truncate">{name}</span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isPicked
                                    ? 'bg-[hsl(270,60%,50%)] border-[hsl(270,60%,50%)]'
                                    : 'border-white/30'
                                }`}
                              >
                                {isPicked && <CheckCircle className="h-3 w-3 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Hosts &amp; co-hosts are always included.
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,40%)] text-white text-sm relative z-10"
              onClick={handleAfterRally}
              disabled={isLoading || !selectedLocation || stealthDisabled}
            >
              <Moon className="h-4 w-4 mr-2" />
              {stealthMode ? 'Start Private After R@lly' : 'Start After R@lly'}
            </Button>
          </div>

          {/* Complete Rally Option */}
          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-center gap-2 text-left"
            onClick={handleCompleteRally}
            disabled={isLoading}
          >
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold font-montserrat">Complete R@lly</div>
              <p className="text-xs text-muted-foreground font-normal">
                End the event—everyone's home safe.
              </p>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
