import { Car, CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useEventSafetyStatus, getSafetyState, type AttendeeWithSafetyStatus } from '@/hooks/useSafetyStatus';
import { getPrivateName } from '@/lib/identity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface StatusTabProps {
  event: any;
  canManage: boolean;
  isAfterRally: boolean;
}

type Bucket = 'arrived' | 'on_the_way' | 'not_left' | 'skipped';

function bucketFor(a: AttendeeWithSafetyStatus): Bucket {
  const state = getSafetyState(a);
  if (state === 'arrived_safely') return 'arrived';
  if (state === 'participating') return 'on_the_way';
  if (state === 'not_participating') return 'skipped';
  return 'not_left';
}

const BUCKET_LABEL: Record<Bucket, string> = {
  arrived: 'Arrived Safely',
  on_the_way: 'On the Way Home',
  not_left: "Hasn't Left",
  skipped: "Didn't Participate",
};

const BUCKET_TEXT: Record<Bucket, string> = {
  arrived: 'text-green-400',
  on_the_way: 'text-primary',
  not_left: 'text-yellow-400',
  skipped: 'text-white/70',
};

function CommandTile({
  bucket,
  count,
  icon,
}: {
  bucket: Bucket;
  count: number;
  icon: React.ReactNode;
}) {
  const skin: Record<Bucket, string> = {
    arrived: 'border-green-500/50 bg-green-500/20',
    on_the_way: 'border-primary/50 bg-primary/20',
    not_left: 'border-yellow-500/50 bg-yellow-500/20',
    skipped: 'border-white/25 bg-white/10',
  };
  return (
    <div className={cn('rounded-2xl border p-3', skin[bucket])}>
      <p className="text-[11px] font-semibold text-white leading-tight">{BUCKET_LABEL[bucket]}</p>
      <div className="mt-1.5 flex items-end justify-between">
        <span className={cn('font-montserrat text-3xl font-extrabold leading-none', BUCKET_TEXT[bucket])}>
          {count}
        </span>
        <span className={BUCKET_TEXT[bucket]}>{icon}</span>
      </div>
    </div>
  );
}

export function StatusTab({ event, canManage, isAfterRally }: StatusTabProps) {
  const { data: attendees } = useEventSafetyStatus(event.id);
  const list = attendees || [];

  const counts: Record<Bucket, number> = { arrived: 0, on_the_way: 0, not_left: 0, skipped: 0 };
  list.forEach((a) => { counts[bucketFor(a)] += 1; });

  const strip = [
    { label: 'Total', value: list.length, cls: 'text-white' },
    { label: 'Home Safe', value: counts.arrived, cls: 'text-green-400' },
    { label: 'On the Way', value: counts.on_the_way, cls: 'text-primary' },
    { label: "Hasn't Left", value: counts.not_left, cls: 'text-yellow-400' },
    { label: "Didn't Participate", value: counts.skipped, cls: 'text-white/50' },
  ];

  const bucketIcon = (b: Bucket) => {
    if (b === 'arrived') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (b === 'on_the_way') return <Car className="h-4 w-4 text-primary" />;
    if (b === 'not_left') return <Clock className="h-4 w-4 text-yellow-400" />;
    return <Users className="h-4 w-4 text-white/40" />;
  };

  const timeFor = (a: AttendeeWithSafetyStatus) => {
    const ts = a.dd_dropoff_confirmed_at || a.going_home_at;
    if (!ts) return '—';
    try {
      return format(new Date(ts), 'h:mm a');
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4">
      {/* Everyone's status */}
      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-montserrat font-extrabold text-white">Everyone's Status</h3>
              <p className="text-xs text-white/60">Real-time overview of your squad.</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-green-400 shrink-0" />
          </div>

          <div className="grid grid-cols-5 gap-1 rounded-xl border border-white/10 bg-white/5 p-2">
            {strip.map((s) => (
              <div key={s.label} className="text-center">
                <p className={cn('font-montserrat text-xl font-extrabold leading-none', s.cls)}>
                  {s.value}
                </p>
                <p className="mt-1 text-[9px] leading-tight text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Command grid */}
      <div className="space-y-2">
        <p className="font-montserrat text-sm font-extrabold text-white">R@lly Home Command</p>
        <div className="grid grid-cols-2 gap-2">
          <CommandTile bucket="arrived" count={counts.arrived} icon={bucketIcon('arrived')} />
          <CommandTile bucket="on_the_way" count={counts.on_the_way} icon={bucketIcon('on_the_way')} />
          <CommandTile bucket="not_left" count={counts.not_left} icon={bucketIcon('not_left')} />
          <CommandTile bucket="skipped" count={counts.skipped} icon={bucketIcon('skipped')} />
        </div>
      </div>

      {/* Roster */}
      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-2">
          <p className="px-2 pt-1 pb-2 font-montserrat text-sm font-extrabold text-white">Squad Roster</p>
          {list.length === 0 && <p className="px-2 pb-3 text-sm text-white/50">No attendees yet.</p>}
          {list.map((a) => {
            const b = bucketFor(a);
            const name = a.profile ? getPrivateName(a.profile as any) : 'Someone';
            return (
              <div key={a.id} className="flex items-center gap-3 px-2 py-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={a.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                    {(name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{name}</p>
                <p className={cn('shrink-0 text-xs font-medium', BUCKET_TEXT[b])}>{BUCKET_LABEL[b]}</p>
                <p className="w-14 shrink-0 text-right text-[11px] text-white/50">{timeFor(a)}</p>
                <span className="shrink-0">{bucketIcon(b)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canManage && (
        <HostSafetyDashboard
          eventId={event.id}
          isAfterRally={isAfterRally}
          onRequestRide={onRequestRide}
          onCompleteRally={onCompleteRally}
        />
      )}
    </div>
  );
}
