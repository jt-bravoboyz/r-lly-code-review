import { useState } from 'react';
import { Music2, ChevronDown, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useSongRecs, useAddSongRec, useDeleteSongRec } from '@/hooks/useSongRecs';
import { toast } from 'sonner';

interface Props {
  eventId: string;
  isParticipant: boolean;
  currentProfileId?: string;
}

export function SongRecsCard({ eventId, isParticipant, currentProfileId }: Props) {
  const [open, setOpen] = useState(false);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const { data: recs = [] } = useSongRecs(eventId);
  const addRec = useAddSongRec(eventId);
  const deleteRec = useDeleteSongRec(eventId);

  const canSubmit = song.trim().length > 0 && artist.trim().length > 0 && !addRec.isPending;
  const count = recs.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !currentProfileId) return;
    try {
      await addRec.mutateAsync({
        profileId: currentProfileId,
        songName: song.trim(),
        artist: artist.trim(),
      });
      setSong('');
      setArtist('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not add rec');
    }
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Music2 className="h-3.5 w-3.5" style={{ color: 'var(--theme-button)' }} />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Song Rec's
              </span>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-4 pb-4 space-y-4">
            {isParticipant && (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  maxLength={100}
                  placeholder="Song Name"
                  className="rally-create-input flex-1"
                />
                <Input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  maxLength={100}
                  placeholder="Artist"
                  className="rally-create-input flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!canSubmit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-shadow active:shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                  aria-label="Add song"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}

            {recs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No recs yet. Be the first to set the tone.
              </p>
            ) : (
              <div>
                {recs.map((rec) => {
                  const isOwn = rec.profile_id === currentProfileId;
                  const name = rec.profile?.display_name || 'R@lly Member';
                  const initials = name.slice(0, 2).toUpperCase();
                  const row = (
                    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-b-0 animate-fade-in">
                      <Avatar className="h-8 w-8 shrink-0">
                        {rec.profile?.avatar_url && <AvatarImage src={rec.profile.avatar_url} alt={name} />}
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{name}</p>
                        <p className="text-base font-medium text-[#F47A19] truncate">{rec.song_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{rec.artist}</p>
                      </div>
                    </div>
                  );
                  if (!isOwn) {
                    return <div key={rec.id}>{row}</div>;
                  }
                  return (
                    <ContextMenu key={rec.id}>
                      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => deleteRec.mutate(rec.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
