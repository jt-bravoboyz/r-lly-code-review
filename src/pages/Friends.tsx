import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, Check, X, ShieldOff, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import {
  useFriendships,
  useRespondToFriendRequest,
  type Friendship,
} from '@/hooks/useFriendships';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePublicProfile } from '@/contexts/PublicProfileContext';

interface MiniProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function Friends() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { openProfile } = usePublicProfile();
  const { data: friendships = [], isLoading } = useFriendships();
  const respond = useRespondToFriendRequest();

  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});

  // Resolve "the other person" for each friendship row
  const otherIds = useMemo(() => {
    if (!profile?.id) return [] as string[];
    const ids = new Set<string>();
    friendships.forEach((f) => {
      ids.add(f.requester_id === profile.id ? f.recipient_id : f.requester_id);
    });
    return Array.from(ids);
  }, [friendships, profile?.id]);

  useEffect(() => {
    if (!otherIds.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', otherIds);
      if (cancelled) return;
      setProfiles(Object.fromEntries((data ?? []).map((p: any) => [p.id, p])));
    })();
    return () => { cancelled = true; };
  }, [otherIds]);

  const partitions = useMemo(() => {
    const accepted: Friendship[] = [];
    const incoming: Friendship[] = [];
    const outgoing: Friendship[] = [];
    const blocked: Friendship[] = [];
    friendships.forEach((f) => {
      if (f.status === 'accepted') accepted.push(f);
      else if (f.status === 'blocked') blocked.push(f);
      else if (f.status === 'pending' && f.recipient_id === profile?.id) incoming.push(f);
      else if (f.status === 'pending' && f.requester_id === profile?.id) outgoing.push(f);
    });
    return { accepted, incoming, outgoing, blocked };
  }, [friendships, profile?.id]);

  const matchesSearch = (id: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (profiles[id]?.display_name ?? '').toLowerCase().includes(q);
  };

  const otherId = (f: Friendship) => (f.requester_id === profile?.id ? f.recipient_id : f.requester_id);

  const Row = ({ f, actions }: { f: Friendship; actions?: React.ReactNode }) => {
    const id = otherId(f);
    const p = profiles[id];
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card/60 border border-border/60 px-3 py-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => openProfile(id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <Avatar className="h-10 w-10 ring-2 ring-background">
            {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name ?? ''} />}
            <AvatarFallback className="text-xs font-semibold">{initialsOf(p?.display_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{p?.display_name ?? 'Someone'}</p>
          </div>
        </button>
        {actions}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/30 pb-24">
      <div
        className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
      >
        <div className="px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Friends</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              className="pl-9 h-10 rounded-2xl bg-card/60 border-border/60"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-3 w-full rounded-2xl">
            <TabsTrigger value="all">
              All <span className="ml-1 text-xs opacity-60">{partitions.accepted.length}</span>
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests <span className="ml-1 text-xs opacity-60">{partitions.incoming.length}</span>
            </TabsTrigger>
            <TabsTrigger value="blocked">Blocked</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
            ) : partitions.accepted.filter((f) => matchesSearch(otherId(f))).length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No friends yet"
                body="Find people from your events or invite the crew."
              />
            ) : (
              partitions.accepted.filter((f) => matchesSearch(otherId(f))).map((f) => <Row key={f.id} f={f} />)
            )}

            {partitions.outgoing.length > 0 && (
              <div className="pt-4">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80 mb-2">
                  Sent · {partitions.outgoing.length}
                </p>
                <div className="space-y-2">
                  {partitions.outgoing.filter((f) => matchesSearch(otherId(f))).map((f) => (
                    <Row
                      key={f.id}
                      f={f}
                      actions={
                        <span className="text-[11px] font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted/60">
                          Requested
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-2">
            {partitions.incoming.filter((f) => matchesSearch(otherId(f))).length === 0 ? (
              <EmptyState
                icon={<UserPlus className="h-8 w-8" />}
                title="No new requests"
                body="When someone wants to R@lly with you, it'll land here."
              />
            ) : (
              partitions.incoming.filter((f) => matchesSearch(otherId(f))).map((f) => (
                <Row
                  key={f.id}
                  f={f}
                  actions={
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 px-3 rounded-xl bg-primary text-primary-foreground"
                        onClick={async () => {
                          await respond.mutateAsync({ friendshipId: f.id, response: 'accepted' });
                          toast.success('You\'re friends');
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 rounded-xl"
                        onClick={async () => {
                          await respond.mutateAsync({ friendshipId: f.id, response: 'declined' });
                          toast.success('Request declined');
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="blocked" className="mt-4 space-y-2">
            {partitions.blocked.filter((f) => matchesSearch(otherId(f))).length === 0 ? (
              <EmptyState
                icon={<ShieldOff className="h-8 w-8" />}
                title="No one's blocked"
                body="Profiles you block won't see your R@llies."
              />
            ) : (
              partitions.blocked.filter((f) => matchesSearch(otherId(f))).map((f) => (
                <Row
                  key={f.id}
                  f={f}
                  actions={
                    <span className="text-[11px] font-medium text-destructive px-2 py-1 rounded-full bg-destructive/10">
                      Blocked
                    </span>
                  }
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-card/60 border border-border/50 backdrop-blur-xl p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
