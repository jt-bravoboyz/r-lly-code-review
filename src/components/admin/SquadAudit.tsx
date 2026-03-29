import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Image, ChevronRight, ArrowLeft, Crown } from 'lucide-react';
import { format } from 'date-fns';

interface SquadRow {
  id: string;
  name: string;
  symbol: string | null;
  created_at: string;
  owner_id: string;
  group_photo_url: string | null;
  owner_profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
  members: { id: string; profile_id: string; added_at: string; profile: { id: string; display_name: string | null; avatar_url: string | null } | null }[];
}

function useAdminSquads() {
  return useQuery({
    queryKey: ['admin-squads-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          owner_profile:safe_profiles!squads_owner_id_fkey(id, display_name, avatar_url),
          members:squad_members(
            id, profile_id, added_at,
            profile:safe_profiles(id, display_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (error) throw error;

      // Count media per squad (rally_media is event-based, squad photos are just group_photo_url)
      return (data || []) as unknown as SquadRow[];
    },
  });
}

export function SquadAudit() {
  const { data: squads, isLoading } = useAdminSquads();
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const selectedSquad = squads?.find(s => s.id === selectedSquadId);

  if (selectedSquad) {
    const allMembers = [
      { profile_id: selectedSquad.owner_id, profile: selectedSquad.owner_profile, isOwner: true, added_at: selectedSquad.created_at },
      ...(selectedSquad.members || []).map(m => ({ ...m, isOwner: false })),
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSquadId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-montserrat">{selectedSquad.name}</CardTitle>
            <Badge variant="secondary" className="ml-auto">{allMembers.length} members</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {allMembers.map(member => (
            <div key={member.profile_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {member.profile?.display_name || 'Unknown'}
                  {member.isOwner && <Crown className="h-3 w-3 text-primary" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.isOwner ? 'Owner' : 'Member'} · {format(new Date(member.added_at), 'MMM d, yyyy')}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{member.profile_id.slice(0, 8)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Squad Audit ({squads?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {squads?.map(squad => {
          const totalMembers = 1 + (squad.members?.length || 0);
          const hasPhoto = !!squad.group_photo_url;

          return (
            <button
              key={squad.id}
              onClick={() => setSelectedSquadId(squad.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{squad.name}</p>
                <p className="text-xs text-muted-foreground">
                  by {squad.owner_profile?.display_name || 'Unknown'} · {format(new Date(squad.created_at), 'MMM d')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {totalMembers}
                </Badge>
                {hasPhoto && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Image className="h-3 w-3" />
                    1
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
        {(!squads || squads.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">No squads created yet</p>
        )}
      </CardContent>
    </Card>
  );
}
