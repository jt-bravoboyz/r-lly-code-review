import { useState } from 'react';
import { Settings, Pencil, Trash2, Crown, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useRemoveSquadMember } from '@/hooks/useSquads';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Member {
  profile_id: string;
  isOwner: boolean;
  added_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SquadSettingsDialogProps {
  squadId: string;
  squadName: string;
  groupPhotoUrl: string | null;
  members: Member[];
  onPhotoChange: () => void;
}

export function SquadSettingsDialog({
  squadId,
  squadName,
  groupPhotoUrl,
  members,
  onPhotoChange,
}: SquadSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(squadName);
  const [saving, setSaving] = useState(false);
  const removeMember = useRemoveSquadMember();
  const queryClient = useQueryClient();

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === squadName) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('squads')
        .update({ name: trimmed })
        .eq('id', squadId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['squad-detail', squadId] });
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      toast.success('Squad name updated');
      setEditingName(false);
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (profileId: string, name: string) => {
    try {
      await removeMember.mutateAsync({ squadId, profileId });
      toast.success(`Removed ${name}`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Squad Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Squad Name */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Squad Name</Label>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                  maxLength={50}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNewName(squadName); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{squadName}</p>
                <Button variant="ghost" size="sm" onClick={() => { setNewName(squadName); setEditingName(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </div>
            )}
          </div>

          {/* Group Photo */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Group Photo</Label>
            <div className="flex items-center gap-3">
              {groupPhotoUrl ? (
                <img src={groupPhotoUrl} alt="Squad" className="w-16 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => { onPhotoChange(); setOpen(false); }}>
                <Camera className="h-3.5 w-3.5 mr-1" /> Change Photo
              </Button>
            </div>
          </div>

          <Separator />

          {/* Roster */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Roster ({members.length})
            </Label>
            {members.map((member) => (
              <div key={member.profile_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {member.profile?.display_name || 'Unknown'}
                      {member.isOwner && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                          <Crown className="h-2.5 w-2.5" /> Captain
                        </Badge>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(member.added_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {!member.isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {member.profile?.display_name || 'member'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They will be removed from the squad and its chat.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.profile_id, member.profile?.display_name || 'member')}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
