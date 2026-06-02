import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Car, CheckCircle2, Home, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  useActiveSquadSession,
  useEndSquadSession,
  useMySessionParticipant,
  useSessionParticipants,
  useStartSquadSession,
  useUpdateMyParticipantStatus,
  type RallyHomeParticipant,
} from '@/hooks/useSquadRallyHome';
import { getPrivateName } from '@/lib/identity';
import { cn } from '@/lib/utils';

interface SquadRallyHomeCardProps {
  squadId: string;
  squadName: string;
  isOwner: boolean;
}

export function SquadRallyHomeCard({ squadId, isOwner }: SquadRallyHomeCardProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useActiveSquadSession(squadId);
  const startSession = useStartSquadSession(squadId);
  const endSession = useEndSquadSession(squadId);

  const active = data?.active || null;
  const lastCompleted = data?.lastCompleted || null;

  const [confirmEnd, setConfirmEnd] = useState(false);

  if (isLoading) {
    return (
      <Card className="rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.04)] bg-card">
        <CardContent className="p-4">
          <div className="h-20 animate-pulse bg-muted/40 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!active) {
    return (
      <Card className="rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.04)] bg-card">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-montserrat font-extrabold text-lg text-foreground">
              🏠 R@lly Home
            </h3>
            <p className="text-sm text-muted-foreground">
              Keep your squad safe tonight
            </p>
          </div>

          {lastCompleted && (
            <p className="text-xs text-muted-foreground">
              Last session:{' '}
              {new Date(lastCompleted.ended_at || lastCompleted.started_at).toLocaleDateString(
                undefined,
                { weekday: 'short', month: 'short', day: 'numeric' }
              )}
            </p>
          )}

          <Button
            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-montserrat font-bold"
            disabled={startSession.isPending}
            onClick={() => {
              startSession.mutate(undefined, {
                onError: (e: any) =>
                  toast({
                    title: "Couldn't start session",
                    description: e?.message || 'Try again.',
                    variant: 'destructive',
                  }),
              });
            }}
          >
            {startSession.isPending ? 'Starting…' : 'Start R@lly Home for Squad'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canEnd = isOwner || active.created_by === profile?.id;

  return (
    <>
      <ActiveSessionView
        sessionId={active.id}
        canEnd={canEnd}
        onEndClick={() => setConfirmEnd(true)}
      />

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End R@lly Home session?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes the safety check-in for your squad. You can always start a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                endSession.mutate(active.id, {
                  onSuccess: () => setConfirmEnd(false),
                })
              }
            >
              End session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {children}
    </p>
  );
}

function ActiveSessionView({
  sessionId,
  canEnd,
  onEndClick,
}: {
  sessionId: string;
  canEnd: boolean;
  onEndClick: () => void;
}) {
  const { data: participants } = useSessionParticipants(sessionId);
  const { data: me } = useMySessionParticipant(sessionId);
  const update = useUpdateMyParticipantStatus(sessionId);
  const { toast } = useToast();

  const [planOpen, setPlanOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [isDD, setIsDD] = useState(false);
  const [needsRide, setNeedsRide] = useState(false);

  const arrived = useMemo(
    () => (participants || []).filter((p) => p.arrived_safely),
    [participants]
  );
  const stillOut = useMemo(
    () => (participants || []).filter((p) => !p.arrived_safely),
    [participants]
  );

  const ddList = useMemo(
    () => (participants || []).filter((p) => p.is_dd),
    [participants]
  );
  const ridersList = useMemo(
    () => (participants || []).filter((p) => p.needs_ride),
    [participants]
  );

  const openPlan = () => {
    setDestination(me?.destination_name || '');
    setIsDD(me?.is_dd || false);
    setNeedsRide(me?.needs_ride || false);
    setPlanOpen(true);
  };

  const savePlan = () => {
    update.mutate(
      {
        destination_name: destination.trim() || null,
        is_dd: isDD,
        needs_ride: needsRide,
        opted_out: false,
        not_participating_confirmed: false,
      },
      {
        onSuccess: () => {
          setPlanOpen(false);
          toast({ title: 'Plan saved', description: 'Your home plan is locked in.' });
        },
        onError: (e: any) =>
          toast({
            title: "Couldn't save plan",
            description: e?.message || 'Try again.',
            variant: 'destructive',
          }),
      }
    );
  };

  const renderStatusCTA = () => {
    if (!me) return null;

    if (me.opted_out || me.not_participating_confirmed === true) {
      return (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>You opted out of this session</span>
          <Button
            variant="link"
            className="h-auto p-0 text-primary"
            onClick={() =>
              update.mutate({ opted_out: false, not_participating_confirmed: false })
            }
          >
            Rejoin
          </Button>
        </div>
      );
    }

    if (me.arrived_safely) {
      return (
        <Button
          disabled
          className="w-full h-14 rounded-full bg-green-600 hover:bg-green-600 text-white font-montserrat font-bold"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Arrived Safely
        </Button>
      );
    }

    if (me.going_home_at) {
      return (
        <Button
          className="w-full h-14 rounded-full bg-green-600 hover:bg-green-700 text-white font-montserrat font-bold"
          onClick={() =>
            update.mutate({
              arrived_safely: true,
              arrived_at: new Date().toISOString(),
            })
          }
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          I've Arrived Safely
        </Button>
      );
    }

    if (me.destination_name) {
      return (
        <Button
          className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 font-montserrat font-bold"
          onClick={() => update.mutate({ going_home_at: new Date().toISOString() })}
        >
          <Home className="h-5 w-5 mr-2" />
          I'm Heading Home Now
        </Button>
      );
    }

    return (
      <Button
        className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 font-montserrat font-bold"
        onClick={openPlan}
      >
        Set My Home Plan
      </Button>
    );
  };

  return (
    <Card className="rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.04)] bg-card">
      <CardContent className="p-4 space-y-5">
        <div>
          <h3 className="font-montserrat font-extrabold text-lg text-foreground">
            🏠 R@lly Home
          </h3>
          <p className="text-sm text-muted-foreground">Squad session active</p>
        </div>

        {/* Your Status */}
        <div className="space-y-2">
          <SectionHeader>Your Status</SectionHeader>
          {renderStatusCTA()}
          {me && !me.opted_out && !me.arrived_safely && (me.destination_name || me.going_home_at) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={openPlan}
            >
              Edit plan
            </Button>
          )}
        </div>

        {/* Getting Around */}
        <div className="space-y-2">
          <SectionHeader>Getting Around</SectionHeader>
          {me?.is_dd && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-montserrat font-bold">
              <Car className="h-3.5 w-3.5" />
              You're the DD
            </div>
          )}
          {ddList.length === 0 && ridersList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ride plans set yet</p>
          ) : (
            <ul className="space-y-1.5">
              {ddList.map((p) => (
                <li key={`dd-${p.id}`} className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">
                    {firstName(p)} is driving tonight
                  </span>
                </li>
              ))}
              {ridersList.map((p) => (
                <li key={`r-${p.id}`} className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{firstName(p)} needs a ride</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Everyone's Status */}
        <div className="space-y-2">
          <SectionHeader>Everyone's Status</SectionHeader>
          <p className="text-sm font-semibold font-montserrat">
            🏠 {arrived.length} of {participants?.length || 0} home safe
          </p>
          {arrived.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Made it home ({arrived.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {arrived.map((p) => renderAvatar(p, true))}
              </div>
            </div>
          )}
          {stillOut.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Still out ({stillOut.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {stillOut.map((p) => renderAvatar(p, false))}
              </div>
            </div>
          )}
        </div>

        {canEnd && (
          <button
            type="button"
            onClick={onEndClick}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            End session
          </button>
        )}
      </CardContent>

      <Sheet open={planOpen} onOpenChange={setPlanOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-montserrat font-extrabold">
              Set Your Home Plan
            </SheetTitle>
            <SheetDescription>
              Let your squad know how you're getting home.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="dest">Destination</Label>
              <Input
                id="dest"
                placeholder="Home address, neighborhood, etc."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div>
                <Label className="text-sm font-semibold">I'm the DD tonight</Label>
                <p className="text-xs text-muted-foreground">Driving the squad home</p>
              </div>
              <Switch checked={isDD} onCheckedChange={setIsDD} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div>
                <Label className="text-sm font-semibold">I need a ride home</Label>
                <p className="text-xs text-muted-foreground">Let the DDs know</p>
              </div>
              <Switch checked={needsRide} onCheckedChange={setNeedsRide} />
            </div>

            <Button
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-montserrat font-bold"
              onClick={savePlan}
              disabled={update.isPending}
            >
              Save Plan
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                update.mutate(
                  { opted_out: true, not_participating_confirmed: true },
                  { onSuccess: () => setPlanOpen(false) }
                );
              }}
            >
              Not joining this session
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function firstName(p: RallyHomeParticipant): string {
  return (getPrivateName(p.profile as any) || '').split(' ')[0] || 'Someone';
}

function renderAvatar(p: RallyHomeParticipant, isArrived: boolean) {
  const name = firstName(p);
  return (
    <div key={p.id} className="flex flex-col items-center gap-1 w-12">
      <Avatar
        className={cn(
          'h-10 w-10',
          isArrived
            ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background'
            : 'opacity-40'
        )}
      >
        <AvatarImage src={p.profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-center truncate max-w-[48px]">{name}</span>
    </div>
  );
}
