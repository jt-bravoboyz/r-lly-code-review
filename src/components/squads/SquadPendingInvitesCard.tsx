import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, UserPlus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SquadPendingInvitesCardProps {
  squadId: string;
}

type PendingInvite = {
  id: string;
  invite_type: string;
  contact_value: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export function SquadPendingInvitesCard({ squadId }: SquadPendingInvitesCardProps) {
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['squad-pending-invites', squadId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_squad_invites_safe', {
        p_squad_id: squadId,
      });
      if (error) throw error;
      return (data as PendingInvite[]).filter((i) => i.status === 'pending');
    },
    enabled: !!squadId,
    staleTime: 30_000,
  });

  // Fetch display names for any profile-typed invites (contact_value starts with "profile:")
  const profileIds = invites
    .filter((i) => i.contact_value?.startsWith('profile:'))
    .map((i) => i.contact_value.replace(/^profile:/, ''))
    .filter(Boolean);

  const { data: profileMap = {} } = useQuery({
    queryKey: ['squad-pending-invite-profiles', profileIds.sort().join(',')],
    queryFn: async () => {
      if (!profileIds.length) return {};
      const { data, error } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);
      if (error) throw error;
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: profileIds.length > 0,
  });

  if (isLoading || invites.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Pending Invites
        <Badge variant="outline" className="text-xs ml-auto">
          {invites.length}
        </Badge>
      </h2>
      <div className="space-y-2">
        {invites.map((invite) => {
          const isProfile = invite.contact_value?.startsWith('profile:');
          const isEmail = invite.invite_type === 'email';
          const profileId = isProfile ? invite.contact_value.replace(/^profile:/, '') : null;
          const profileInfo = profileId ? profileMap[profileId] : null;

          const label = isProfile
            ? profileInfo?.display_name || 'R@lly member'
            : invite.contact_value;
          const sentAgo = formatDistanceToNow(new Date(invite.created_at), { addSuffix: true });

          return (
            <Card key={invite.id} className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isProfile ? (
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profileInfo?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(label || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                      {isEmail ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : (
                        <Phone className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Sent {sentAgo}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="gap-1 bg-primary/15 text-primary border-primary/25 text-[10px] shrink-0"
                >
                  <UserPlus className="h-3 w-3" />
                  Pending
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
