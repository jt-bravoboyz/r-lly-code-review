import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChatView } from './ChatView';
import { useSquadChat } from '@/hooks/useSquadChat';

interface SquadChatSheetProps {
  squadId: string;
  squadName: string;
  squadSymbol?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SquadChatSheet({ 
  squadId, 
  squadName, 
  squadSymbol,
  open, 
  onOpenChange 
}: SquadChatSheetProps) {
  const { chat, messages, isLoading } = useSquadChat(squadId);

  const displayTitle = squadSymbol 
    ? `${squadSymbol} ${squadName}` 
    : squadName;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <span>{displayTitle}</span>
            {chat?.linked_event_id && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Live Rally
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          {chat?.id ? (
            <ChatView 
              chatId={chat.id}
              messages={messages}
              isLoading={isLoading}
              storagePath={`squads/${squadId}`}
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Chat not available</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
