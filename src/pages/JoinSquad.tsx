import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import rallyLogo from '@/assets/rally-logo.png';

interface SquadInvite {
  id: string;
  squad_id: string;
  invite_code: string;
  status: string;
  expires_at: string;
  squad: {
    id: string;
    name: string;
    owner: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

export default function JoinSquad() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<SquadInvite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      if (!code) {
        setError('No invite code provided');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('squad_invites')
          .select(`
            id,
            squad_id,
            invite_code,
            status,
            expires_at,
            squad:squads(
              id,
              name,
              owner:safe_profiles!squads_owner_id_fkey(id, display_name, avatar_url)
            )
          `)
          .eq('invite_code', code.toUpperCase())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Invite not found or expired');
          setIsLoading(false);
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setError('This invite has expired');
          setIsLoading(false);
          return;
        }

        // Transform the data to match our interface
        const inviteData = {
          ...data,
          squad: Array.isArray(data.squad) ? data.squad[0] : data.squad,
        } as SquadInvite;

        setInvite(inviteData);
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Failed to load invite');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvite();
  }, [code]);

  const handleJoinSquad = async () => {
    if (!invite || !profile) {
      if (!profile) {
        toast.error('Please sign in to join a squad');
        navigate('/auth');
        return;
      }
      return;
    }

    setIsJoining(true);
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', invite.squad_id)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (existingMember) {
        toast.info('You are already a member of this squad!');
        navigate('/squads');
        return;
      }

      // Add as member
      const { error: joinError } = await supabase
        .from('squad_members')
        .insert({
          squad_id: invite.squad_id,
          profile_id: profile.id,
        });

      if (joinError) throw joinError;

      // Update invite status
      await supabase
        .from('squad_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      toast.success(`Welcome to ${invite.squad.name}! 🎉`);
      navigate('/squads');
    } catch (err: any) {
      console.error('Error joining squad:', err);
      toast.error(err.message || 'Failed to join squad');
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-secondary/30 via-background to-secondary/20">
      <Header title="Join Squad" />
      
      <main className="container py-6 max-w-md mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/squads">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Squads
          </Link>
        </Button>

        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading invite...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="text-center py-12 border-destructive/50">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-destructive">Oops!</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => navigate('/squads')} variant="outline">
                Go to Squads
              </Button>
            </CardContent>
          </Card>
        ) : invite ? (
          <Card className="overflow-hidden">
            {/* Header with logo */}
            <div className="bg-gradient-to-r from-primary to-secondary p-6 text-center">
              <img src={rallyLogo} alt="R@lly" className="h-10 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white font-montserrat">
                You're Invited!
              </h1>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Squad info */}
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-montserrat">{invite.squad.name}</h2>
                  <p className="text-muted-foreground">Squad</p>
                </div>
              </div>

              {/* Invited by */}
              {invite.squad.owner && (
                <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <Avatar>
                    <AvatarImage src={invite.squad.owner.avatar_url || undefined} />
                    <AvatarFallback>
                      {invite.squad.owner.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Created by</p>
                    <p className="font-medium">{invite.squad.owner.display_name}</p>
                  </div>
                </div>
              )}

              {/* Invite code display */}
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                <p className="text-2xl font-bold tracking-widest font-montserrat text-primary">
                  {invite.invite_code}
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
              {!user ? (
                  <Button 
                    className="w-full gradient-primary"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In to Join
                  </Button>
                ) : (
                  <Button 
                    className="w-full gradient-primary"
                    onClick={handleJoinSquad}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Join Squad
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/squads')}
                >
                  Maybe Later
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
