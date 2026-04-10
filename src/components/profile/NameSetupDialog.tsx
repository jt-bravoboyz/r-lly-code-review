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
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const isOpen = profile?.needs_name_setup === true;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 1) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed, needs_name_setup: false } as any)
        .eq('id', profile!.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(`You're on the list, ${trimmed}. Welcome to R@lly.`);
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

        <div className="space-y-4 pt-2">
          <Input
            placeholder="Your name or handle"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="h-14 rounded-xl text-base font-montserrat"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
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
