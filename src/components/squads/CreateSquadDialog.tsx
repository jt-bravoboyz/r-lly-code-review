import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Search } from 'lucide-react';
import { useCreateSquad, useAllProfiles } from '@/hooks/useSquads';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SquadSymbolPicker, type SquadSymbol } from './SquadSymbolPicker';

export function CreateSquadDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState<SquadSymbol>('shield');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { profile } = useAuth();
  const { data: allProfiles } = useAllProfiles();
  const createSquad = useCreateSquad();

  // Filter out current user and apply search
  const availableProfiles = allProfiles?.filter(p => 
    p.id !== profile?.id &&
    (p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
  ) || [];

  const toggleMember = (profileId: string) => {
    setSelectedMembers(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a squad name');
      return;
    }

    try {
      await createSquad.mutateAsync({ name: name.trim(), memberIds: selectedMembers, symbol });
      toast.success('Squad created!');
      setOpen(false);
      setName('');
      setSymbol('shield');
      setSelectedMembers([]);
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to create squad');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 rounded-full font-montserrat">
          <Plus className="h-4 w-4 mr-2" />
          New Squad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-montserrat">
            <Users className="h-5 w-5 text-primary" />
            Create Squad
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="squad-name" className="font-montserrat">Squad Name</Label>
            <Input
              id="squad-name"
              placeholder="e.g., Friday Night Squad, Downtown Crew"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="font-montserrat">Squad Symbol</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose an icon to represent your squad
            </p>
            <SquadSymbolPicker value={symbol} onChange={setSymbol} size="sm" />
          </div>

          <div>
            <Label className="font-montserrat">Add Members</Label>
            <div className="relative mt-1 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-48 border rounded-lg">
              {availableProfiles.length > 0 ? (
                <div className="p-2 space-y-1">
                  {availableProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleMember(p.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(p.id)}
                        onCheckedChange={() => toggleMember(p.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {p.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.display_name || 'Anonymous'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No users found
                </div>
              )}
            </ScrollArea>

            {selectedMembers.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 rounded-full font-montserrat"
            onClick={handleSubmit}
            disabled={createSquad.isPending}
          >
            {createSquad.isPending ? 'Creating...' : 'Create Squad'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
