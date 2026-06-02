import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PendingInvite {
  squad_id: string;
  squad_name: string;
  squad_symbol: string | null;
  squad_group_photo_url: string | null;
  invited_by: string;
  inviter_name: string | null;
  inviter_avatar: string | null;
  created_at: string;
  expires_at: string;
}

export function PendingSquadInvites() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { data: invites, isLoading } = useQuery({
    queryKey: ['pending-squad-invites', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_pending_squad_invites' as any);
      if (error) throw error;
      return (data || []) as PendingInvite[];
    },
    enabled: !!profile?.id,
  });

  const handleRespond = async (squadId: string, response: 'accepted' | 'declined') => {
    setRespondingId(squadId);
    try {
      const rpc = response === 'accepted' ? 'accept_squad_invite' : 'decline_squad_invite';
      const { data: result, error } = await supabase.rpc(rpc as any, { p_squad_id: squadId });
      if (error) throw error;
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error((result as any).error);
      }
      toast.success(response === 'accepted' ? 'You joined the squad! 🎉' : 'Invite declined');
      queryClient.invalidateQueries({ queryKey: ['pending-squad-invites'] });
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err: any) {
      toast.error(err.message || 'Could not process invite');
    } finally {
      setRespondingId(null);
    }
  };

  if (isLoading || !invites || invites.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold font-montserrat text-foreground">
          Squad Invites <span className="text-muted-foreground font-normal">({invites.length})</span>
        </h3>
      </div>
      {invites.map((inv) => (
        <Card
          key={inv.squad_id}
          className="rounded-2xl border-l-4 border-l-primary bg-gradient-to-br from-primary/[0.08] via-card/70 to-card/60 backdrop-blur-xl shadow-[0_0_24px_rgba(244,122,25,0.25)]"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 border border-primary/30">
                {inv.squad_group_photo_url ? (
                  <AvatarImage src={inv.squad_group_photo_url} alt={inv.squad_name} />
                ) : null}
                <AvatarFallback className="bg-primary/15">
                  <Users className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm font-montserrat text-foreground truncate">
                  {inv.squad_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inv.inviter_name ? `${inv.inviter_name} invited you` : 'You were invited'}
                  {' · '}
                  {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="min-h-[40px] px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold font-montserrat shadow-[0_0_16px_rgba(244,122,25,0.35)]"
                    disabled={respondingId === inv.squad_id}
                    onClick={() => handleRespond(inv.squad_id, 'accepted')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[40px] px-4 rounded-full font-bold font-montserrat border-primary/30 hover:bg-primary/5"
                    disabled={respondingId === inv.squad_id}
                    onClick={() => handleRespond(inv.squad_id, 'declined')}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
