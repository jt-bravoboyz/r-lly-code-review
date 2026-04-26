import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Image as ImageIcon, ChevronRight, ArrowLeft, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { getPrivateName } from '@/lib/identity';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

interface SquadRow {
  id: string;
  name: string;
  symbol: string | null;
  created_at: string;
  owner_id: string;
  group_photo_url: string | null;
  owner_profile: { id: string; display_name: string | null; full_name: string | null; nickname: string | null; avatar_url: string | null } | null;
  members: { id: string; profile_id: string; added_at: string; profile: { id: string; display_name: string | null; full_name: string | null; nickname: string | null; avatar_url: string | null } | null }[];
}

function useAdminSquads() {
  return useQuery({
    queryKey: ['admin-squads-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          owner_profile:safe_profiles!squads_owner_id_fkey(id, display_name, full_name, nickname, avatar_url),
          members:squad_members(
            id, profile_id, added_at,
            profile:safe_profiles(id, display_name, full_name, nickname, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (error) throw error;
      return (data || []) as unknown as SquadRow[];
    },
  });
}

export function SquadAudit() {
  const { data: squads, isLoading } = useAdminSquads();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <BentoCard span={12}>
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </BentoCard>
    );
  }

  const selectedSquad = squads?.find(s => s.id === selectedSquadId);

  if (selectedSquad) {
    const allMembers = [
      { profile_id: selectedSquad.owner_id, profile: selectedSquad.owner_profile, isOwner: true, added_at: selectedSquad.created_at },
      ...(selectedSquad.members || []).map(m => ({ ...m, isOwner: false })),
    ];

    return (
      <BentoCard span={12}>
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSquadId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold font-montserrat truncate">{selectedSquad.name}</h3>
          <MetricPill tone="muted" className="ml-auto">
            <span className="tabular-nums">{allMembers.length}</span> members
          </MetricPill>
        </div>
        <div className="space-y-2">
          {allMembers.map(member => (
            <div
              key={member.profile_id}
              className="flex items-center gap-3 p-2 rounded-xl border border-border/30 bg-background/40"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {getPrivateName(member.profile as any).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {getPrivateName(member.profile as any)}
                  {member.isOwner && <Crown className="h-3 w-3 text-primary" />}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {member.isOwner ? 'Owner' : 'Member'} · {format(new Date(member.added_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Squad Audit
        </span>
        <MetricPill tone="muted" className="ml-auto">
          <span className="tabular-nums">{squads?.length || 0}</span>
        </MetricPill>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 -mr-1">
        {squads?.map(squad => {
          const totalMembers = 1 + (squad.members?.length || 0);
          const hasPhoto = !!squad.group_photo_url;

          return (
            <button
              key={squad.id}
              onClick={() => setSelectedSquadId(squad.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/40 hover:bg-background/70 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{squad.name}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  by {getPrivateName(squad.owner_profile as any)} · {format(new Date(squad.created_at), 'MMM d')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <MetricPill tone="muted">
                  <Users className="h-3 w-3" />
                  <span className="tabular-nums">{totalMembers}</span>
                </MetricPill>
                {hasPhoto && (
                  <MetricPill tone="muted">
                    <ImageIcon className="h-3 w-3" />
                    <span className="tabular-nums">1</span>
                  </MetricPill>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
        {(!squads || squads.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">No squads created yet</p>
        )}
      </div>
    </BentoCard>
  );
}
