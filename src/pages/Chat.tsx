import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Users, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserChats } from '@/hooks/useChat';
import { useAllSquadChats } from '@/hooks/useSquadChat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SquadChatSheet } from '@/components/chat/SquadChatSheet';

export default function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: eventChats, isLoading: eventChatsLoading } = useUserChats();
  const { data: squadChats, isLoading: squadChatsLoading } = useAllSquadChats();
  
  const [selectedSquad, setSelectedSquad] = useState<{
    id: string;
    name: string;
    symbol?: string | null;
  } | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasSquadChats = squadChats && squadChats.length > 0;
  const hasEventChats = eventChats && eventChats.length > 0;

  return (
    <div className="min-h-screen pb-20">
      <Header title="Chat" />
      
      <main className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Chat with your squad and rally attendees</p>
        </div>

        <Tabs defaultValue="squads" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="squads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Squads
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="squads" className="mt-4 space-y-3">
            {squadChatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hasSquadChats ? (
              squadChats.map((chat) => (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSquad({
                    id: chat.squad_id,
                    name: chat.squad?.name || 'Squad',
                    symbol: chat.squad?.symbol
                  })}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">
                        {chat.squad?.symbol || chat.squad?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">
                          {chat.squad?.symbol && `${chat.squad.symbol} `}
                          {chat.squad?.name || 'Squad Chat'}
                        </h3>
                        {chat.linked_event_id && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full shrink-0">
                            Live
                          </span>
                        )}
                      </div>
                      {chat.linked_event && (
                        <p className="text-sm text-muted-foreground truncate">
                          Active: {chat.linked_event.title}
                        </p>
                      )}
                    </div>
                    <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No squad chats yet</h3>
                  <p className="text-muted-foreground">
                    Create or join a squad to start chatting
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-4 space-y-3">
            {eventChatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hasEventChats ? (
              eventChats.map((chat) => (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => chat.event_id && navigate(`/events/${chat.event_id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-secondary/20 text-secondary text-lg">
                        <Calendar className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {chat.event?.title || 'Event Chat'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Tap to view event & chat
                      </p>
                    </div>
                    <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No event chats yet</h3>
                  <p className="text-muted-foreground">
                    Join an event to start chatting with attendees
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Squad Chat Sheet */}
      {selectedSquad && (
        <SquadChatSheet
          squadId={selectedSquad.id}
          squadName={selectedSquad.name}
          squadSymbol={selectedSquad.symbol}
          open={!!selectedSquad}
          onOpenChange={(open) => !open && setSelectedSquad(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
