import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Zap, UserPlus, Settings2 } from 'lucide-react';
import { Squad, useDeleteSquad, useUpdateSquadSymbol } from '@/hooks/useSquads';
import { toast } from 'sonner';
import { SquadInviteDialog } from './SquadInviteDialog';
import { getSquadIcon, SquadSymbolPicker, type SquadSymbol } from './SquadSymbolPicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SquadCardProps {
  squad: Squad;
  onQuickRally?: (squad: Squad) => void;
}

export function SquadCard({ squad, onQuickRally }: SquadCardProps) {
  const deleteSquad = useDeleteSquad();
  const updateSymbol = useUpdateSquadSymbol();
  const members = squad.members || [];
  const [symbolPopoverOpen, setSymbolPopoverOpen] = useState(false);
  
  const Icon = getSquadIcon(squad.symbol || 'shield');
  const isOwned = squad.isOwned !== false; // Default to true for backward compatibility

  const handleDelete = async () => {
    try {
      await deleteSquad.mutateAsync(squad.id);
      toast.success('Squad deleted');
    } catch (error) {
      toast.error('Failed to delete squad');
    }
  };

  const handleSymbolChange = async (newSymbol: SquadSymbol) => {
    try {
      await updateSymbol.mutateAsync({ squadId: squad.id, symbol: newSymbol });
      setSymbolPopoverOpen(false);
      toast.success('Squad symbol updated');
    } catch (error) {
      toast.error('Failed to update symbol');
    }
  };

  return (
    <Card className="bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isOwned ? (
              <Popover open={symbolPopoverOpen} onOpenChange={setSymbolPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors group relative">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Settings2 className="h-3 w-3 text-primary" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Change Symbol</p>
                  <SquadSymbolPicker 
                    value={(squad.symbol || 'shield') as SquadSymbol} 
                    onChange={handleSymbolChange}
                    size="sm"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-foreground font-montserrat flex items-center gap-2">
                {squad.name}
                {!isOwned && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
                    Member
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          {isOwned && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={deleteSquad.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Member avatars */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member) => (
              <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">+{members.length - 5}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Invite Friends button */}
          <SquadInviteDialog 
            squadId={squad.id} 
            squadName={squad.name}
            trigger={
              <Button
                variant="outline"
                className="flex-1 rounded-full font-montserrat"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            }
          />

          {/* Quick Rally button */}
          {onQuickRally && (
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 rounded-full font-montserrat"
              onClick={() => onQuickRally(squad)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Rally
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
