import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Zap, UserPlus, Settings2, MessageCircle, ChevronRight } from 'lucide-react';
import { Squad, useDeleteSquad, useUpdateSquadSymbol } from '@/hooks/useSquads';
import { toast } from 'sonner';
import { SquadInviteDialog } from './SquadInviteDialog';
import { getSquadIcon, SquadSymbolPicker, type SquadSymbol } from './SquadSymbolPicker';
import { SquadChatSheet } from '@/components/chat/SquadChatSheet';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const navigate = useNavigate();
  const deleteSquad = useDeleteSquad();
  const updateSymbol = useUpdateSquadSymbol();
  const members = squad.members || [];
  const [symbolPopoverOpen, setSymbolPopoverOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const Icon = getSquadIcon(squad.symbol || 'shield');
  const isOwned = squad.isOwned !== false;

  const handleNavigateToDetail = () => {
    navigate(`/squads/${squad.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleSwipeRally = () => {
    if (onQuickRally) {
      onQuickRally(squad);
    }
  };

  const handleSwipeChat = () => {
    setChatOpen(true);
  };

  const cardContent = (
    <Card className="bg-card shadow-sm rounded-2xl overflow-hidden border-0">
      <CardContent className="p-4">
        {/* Clickable navigation area */}
        <div 
          onClick={handleNavigateToDetail}
          className="cursor-pointer hover:bg-muted/30 -mx-4 -mt-4 px-4 pt-4 pb-2 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isOwned ? (
                <Popover open={symbolPopoverOpen} onOpenChange={setSymbolPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors group relative shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings2 className="h-3 w-3 text-primary" />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-3 bg-popover" 
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Change Symbol</p>
                    <SquadSymbolPicker 
                      value={(squad.symbol || 'shield') as SquadSymbol} 
                      onChange={handleSymbolChange}
                      size="sm"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-card-foreground font-montserrat flex items-center gap-2 truncate">
                  {squad.name}
                  {!isOwned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-normal shrink-0">
                      Member
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">{members.length + 1} members</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {isOwned && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                  onClick={handleDelete}
                  disabled={deleteSquad.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Member avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-card">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">+{members.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - outside clickable area, hidden on mobile since swipe provides access */}
        {!isMobile && (
          <div className="flex gap-2 pt-3 mt-2 border-t border-border/50">
            {/* Chat button */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>

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
        )}

        {/* Compact action row for mobile - just invite since swipe handles chat/rally */}
        {isMobile && (
          <div className="flex gap-2 pt-3 mt-2 border-t border-border/50">
            <SquadInviteDialog 
              squadId={squad.id} 
              squadName={squad.name}
              trigger={
                <Button
                  variant="outline"
                  className="flex-1 rounded-full font-montserrat"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Friends
                </Button>
              }
            />
          </div>
        )}
      </CardContent>

      {/* Squad Chat Sheet */}
      <SquadChatSheet
        squadId={squad.id}
        squadName={squad.name}
        squadSymbol={squad.symbol}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </Card>
  );

  // Wrap with swipeable on mobile only
  if (isMobile) {
    return (
      <SwipeableCard
        onSwipeLeft={handleSwipeRally}
        onSwipeRight={handleSwipeChat}
      >
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
}
