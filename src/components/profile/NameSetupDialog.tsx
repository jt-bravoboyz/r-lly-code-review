import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

export function IdentitySetupDialog() {
  const { profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const dn = (profile?.display_name ?? '').trim();
  const fn = ((profile as any)?.full_name ?? '').trim();

  // Show whenever the flag is set OR no real full_name has been captured yet.
  const needsSetup =
    profile?.needs_name_setup === true ||
    !fn ||
    !dn ||
    dn === 'R@lly Member';

  const isOpen = !!profile && needsSetup;

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const cleanNickname = nickname.trim();
  const canSubmit = cleanFirstName.length > 0 && cleanLastName.length > 0;

  const handleSave = async () => {
    if (!canSubmit) return;

    const fullName = `${cleanFirstName} ${cleanLastName}`;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          nickname: cleanNickname || null,
          needs_name_setup: false,
        } as any)
        .eq('id', profile!.id);

      if (error) throw error;
      await refreshProfile();
      const greet = cleanNickname || cleanFirstName;
      toast.success(`You're on the list, ${greet}. Welcome to R@lly.`);
    } catch (e: any) {
      toast.error('Failed to save. Try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md border-primary/20" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold font-montserrat">
            Establish your handle.
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-montserrat">
            How should you appear on the guest list?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={50}
            className="h-14 rounded-xl text-base font-montserrat"
            autoFocus
          />
          <Input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={50}
            className="h-14 rounded-xl text-base font-montserrat"
          />
          <div className="space-y-1.5 pt-1">
            <Input
              placeholder="Nickname (optional)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              className="h-14 rounded-xl text-base font-montserrat"
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSave()}
            />
            <p className="text-xs text-muted-foreground font-montserrat px-1">
              This is your R@lly handle. If left blank, we'll use your real name.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !canSubmit}
            className="w-full h-12 rounded-xl font-bold font-montserrat"
          >
            {saving ? 'Saving...' : 'Lock It In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep backward-compatible export
export { IdentitySetupDialog as NameSetupDialog };
