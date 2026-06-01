import { useState, useMemo, useEffect } from 'react';
import { shareContent, copyToClipboard } from '@/lib/nativeShare';
import { getPublicName } from '@/lib/identity';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { openSms, openMailto } from '@/lib/nativeLinks';
import { Mail, MessageSquare, Copy, Check, Send, UserPlus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAllProfiles } from '@/hooks/useSquads';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';


interface SquadInviteDialogProps {
  squadId: string;
  squadName: string;
  trigger?: React.ReactNode;
}

export function SquadInviteDialog({ squadId, squadName, trigger }: SquadInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [optimisticInvited, setOptimisticInvited] = useState<Set<string>>(new Set());
  const { profile } = useAuth();
  const { data: allProfiles } = useAllProfiles();
  const queryClient = useQueryClient();

  const baseUrl = PUBLIC_APP_URL;

  // Persistent invite state pulled from the DB so badges survive close/reopen
  const { data: existingInvites } = useQuery({
    queryKey: ['squad-invites', squadId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squad_invites')
        .select('contact_value, invite_type, status')
        .eq('squad_id', squadId)
        .eq('invited_by', profile!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!profile?.id,
  });

  const invitedProfileIds = useMemo(() => {
    const s = new Set<string>();
    (existingInvites ?? []).forEach((inv) => {
      if (inv.invite_type === 'in_app' && inv.contact_value?.startsWith('profile:')) {
        s.add(inv.contact_value.slice('profile:'.length));
      }
    });
    optimisticInvited.forEach((id) => s.add(id));
    return s;
  }, [existingInvites, optimisticInvited]);

  const invitedEmails = useMemo(() => {
    const s = new Set<string>();
    (existingInvites ?? []).forEach((inv) => {
      if (
        inv.invite_type === 'email' &&
        inv.contact_value &&
        inv.contact_value !== 'link-share' &&
        inv.contact_value !== 'native-share'
      ) {
        s.add(inv.contact_value.toLowerCase());
      }
    });
    return s;
  }, [existingInvites]);

  const invitedPhones = useMemo(() => {
    const s = new Set<string>();
    (existingInvites ?? []).forEach((inv) => {
      if (inv.invite_type === 'sms' && inv.contact_value) {
        s.add(inv.contact_value.replace(/[^\d]/g, '').slice(-10));
      }
    });
    return s;
  }, [existingInvites]);

  const emailAlreadyInvited = email.trim() && invitedEmails.has(email.trim().toLowerCase());
  const phoneAlreadyInvited =
    phone.trim() && invitedPhones.has(phone.replace(/[^\d]/g, '').slice(-10));

  const filteredProfiles = useMemo(() => {
    if (!allProfiles || !profile?.id) return [];
    return allProfiles.filter(p => {
      if (p.id === profile.id) return false;
      if (!userSearch.trim()) return true;
      return (p.display_name || '').toLowerCase().includes(userSearch.toLowerCase());
    });
  }, [allProfiles, profile?.id, userSearch]);


  const handleInviteUser = async (targetProfileId: string) => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('squad_invites')
        .insert({
          squad_id: squadId,
          invited_by: profile.id,
          invite_type: 'in_app',
          contact_value: `profile:${targetProfileId}`,
        });

      if (error) throw error;

      setOptimisticInvited(prev => new Set(prev).add(targetProfileId));
      queryClient.invalidateQueries({ queryKey: ['squad-invites', squadId] });
      toast.success('Invite sent!');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (type: 'email' | 'sms') => {
    const contactValue = type === 'email' ? email : phone;
    
    if (!contactValue.trim()) {
      toast.error(`Please enter ${type === 'email' ? 'an email address' : 'a phone number'}`);
      return;
    }

    if (!profile?.id) {
      toast.error('You must be logged in');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('squad_invites')
        .insert({
          squad_id: squadId,
          invited_by: profile.id,
          invite_type: type,
          contact_value: contactValue.trim(),
        })
        .select('invite_code')
        .single();

      if (error) throw error;

      const inviteLink = `${baseUrl}/join-squad/${data.invite_code}`;
      setGeneratedCode(data.invite_code);

      if (type === 'email') {
        const subject = `Join my squad "${squadName}" on R@lly!`;
        const body =
          `Hey!\n\nI want you to join my squad "${squadName}" on R@lly - the app for planning nights out with friends.\n\n` +
          `Click this link to join: ${inviteLink}\n\n` +
          `Or use invite code: ${data.invite_code}\n\n` +
          `See you there! 🎉`;
        openMailto(contactValue, { subject, body });
        toast.success('Email opened! Send it to invite your friend.');
      } else {
        const message = `Join my squad "${squadName}" on R@lly! 🎉\n\n${inviteLink}\n\nCode: ${data.invite_code}`;
        const cleanPhone = contactValue.replace(/[^\d+]/g, '');
        openSms(cleanPhone, message);
        toast.success('SMS opened! Send it to invite your friend.');
      }

      setEmail('');
      setPhone('');
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast.error(error.message || 'Failed to create invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in');
      return;
    }

    try {
      let code = generatedCode;
      if (!code) {
        const { data, error } = await supabase
          .from('squad_invites')
          .insert({
            squad_id: squadId,
            invited_by: profile.id,
            invite_type: 'email',
            contact_value: 'link-share',
          })
          .select('invite_code')
          .single();

        if (error) throw error;
        code = data.invite_code;
        setGeneratedCode(code);
      }

      const inviteLink = `${baseUrl}/join-squad/${code}`;
      await copyToClipboard(inviteLink);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!profile?.id) return;

    try {
      let code = generatedCode;
      if (!code) {
        const { data, error } = await supabase
          .from('squad_invites')
          .insert({
            squad_id: squadId,
            invited_by: profile.id,
            invite_type: 'email',
            contact_value: 'native-share',
          })
          .select('invite_code')
          .single();

        if (error) throw error;
        code = data.invite_code;
        setGeneratedCode(code);
      }

      const inviteLink = `${baseUrl}/join-squad/${code}`;

      await shareContent({
        title: `Join my squad on R@lly`,
        text: `Join "${squadName}" on R@lly! Use code: ${code}`,
        url: inviteLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setOptimisticInvited(new Set()); setUserSearch(''); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to {squadName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="app" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="app" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              In-App
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="app" className="space-y-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/45 z-10 pointer-events-none" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-3">
                {filteredProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
                )}
                {filteredProfiles.map((p) => {
                  const alreadyInvited = invitedProfileIds.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{(p.display_name || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{getPublicName(p)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyInvited ? 'ghost' : 'default'}
                        disabled={isLoading || alreadyInvited}
                        onClick={() => handleInviteUser(p.id)}
                        className="h-7 text-xs gap-1"
                      >
                        {alreadyInvited ? (
                          <><Check className="h-3 w-3" /> Sent</>
                        ) : (
                          <><Send className="h-3 w-3" /> Invite</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Friend's Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailAlreadyInvited && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary" /> Already invited via email
                </p>
              )}
            </div>
            <Button
              onClick={() => handleSendInvite('email')}
              disabled={isLoading || !email.trim()}
              variant={emailAlreadyInvited ? 'outline' : 'default'}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Sending...' : emailAlreadyInvited ? 'Re-send Email Invite' : 'Send Email Invite'}
            </Button>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Friend's Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {phoneAlreadyInvited && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary" /> Already invited via SMS
                </p>
              )}
            </div>
            <Button
              onClick={() => handleSendInvite('sms')}
              disabled={isLoading || !phone.trim()}
              variant={phoneAlreadyInvited ? 'outline' : 'default'}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Sending...' : phoneAlreadyInvited ? 'Re-send SMS Invite' : 'Send SMS Invite'}
            </Button>
          </TabsContent>

        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or share link</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleCopyLink} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button onClick={handleShare} className="gap-2">
            <Send className="h-4 w-4" />
            Share
          </Button>
        </div>

        {generatedCode && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
            <p className="text-lg font-bold tracking-widest font-montserrat text-primary">
              {generatedCode}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
