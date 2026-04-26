import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Award } from 'lucide-react';
import { getPrivateName, hasNickname } from '@/lib/identity';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

interface UserIntelligenceProps {
  profiles: Array<{
    id: string;
    user_id: string;
    display_name: string | null;
    full_name?: string | null;
    nickname?: string | null;
    avatar_url: string | null;
    founding_member: boolean | null;
    founder_number: number | null;
    created_at: string | null;
  }>;
  attendees: Array<{
    profile_id: string;
    event_id: string;
    arrived_safely: boolean | null;
    status: string | null;
  }>;
  rallyEvents: Array<{
    id: string;
    creator_id: string;
  }>;
  headcountByEvent?: Record<string, number>;
}

export function UserIntelligence({ profiles, attendees, rallyEvents, headcountByEvent = {} }: UserIntelligenceProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      getPrivateName(p as any).toLowerCase().includes(q) ||
      (p.nickname?.toLowerCase().includes(q) ?? false)
    );
  });

  const selected = profiles.find(p => p.id === selectedUser);
  const userAttendees = selectedUser ? attendees.filter(a => a.profile_id === selectedUser) : [];
  const userEvents = selectedUser ? rallyEvents.filter(e => e.creator_id === selectedUser) : [];

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          User Intelligence
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-background/40 border-border/40"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1 -mr-1">
          {filtered.slice(0, 20).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedUser(p.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-colors border ${
                selectedUser === p.id
                  ? 'bg-primary/10 border-primary/30'
                  : 'border-border/30 bg-background/40 hover:bg-background/70'
              }`}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={p.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{getPrivateName(p as any).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm truncate flex items-center gap-1.5">
                {getPrivateName(p as any)}
                {hasNickname(p as any) && (
                  <span className="text-[10px] text-muted-foreground">"{p.nickname}"</span>
                )}
              </span>
              {p.founding_member && <Award className="h-3 w-3 text-amber-500 shrink-0" />}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="p-4 rounded-2xl border border-border/40 bg-background/40 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selected.avatar_url || undefined} />
                <AvatarFallback>{getPrivateName(selected as any).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{getPrivateName(selected as any)}</div>
                {hasNickname(selected as any) && (
                  <div className="text-xs text-muted-foreground truncate">Public handle: "{selected.nickname}"</div>
                )}
                {selected.founding_member && (
                  <MetricPill tone="accent" className="mt-1">
                    Founder #{selected.founder_number || '—'}
                  </MetricPill>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded-xl border border-border/30 bg-background/60 text-center">
                <div className="font-bold tabular-nums">{userEvents.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hosted</div>
              </div>
              <div className="p-2 rounded-xl border border-border/30 bg-background/60 text-center">
                <div className="font-bold tabular-nums">{userAttendees.filter(a => a.status === 'attending').length}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Joined</div>
              </div>
              <div className="p-2 rounded-xl border border-border/30 bg-background/60 text-center">
                <div className="font-bold tabular-nums">{userAttendees.filter(a => a.arrived_safely).length}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Safe</div>
              </div>
              <div className="p-2 rounded-xl border border-border/30 bg-background/60 text-center">
                <div className="font-bold text-xs tabular-nums">{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Joined</div>
              </div>
            </div>

            {userEvents.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hosted Headcount
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {userEvents.map((e, i) => (
                    <MetricPill key={e.id} tone="muted">
                      R@lly #{i + 1}: <span className="tabular-nums">{headcountByEvent[e.id] ?? 0}</span>
                    </MetricPill>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground rounded-2xl border border-border/30 bg-background/40">
            Select a user to view details
          </div>
        )}
      </div>
    </BentoCard>
  );
}
