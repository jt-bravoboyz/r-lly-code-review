import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image, X, ExternalLink } from 'lucide-react';
import { useEventChat, useSendMessage, Message } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EventChatProps {
  eventId: string;
  eventTitle: string;
}

// URL regex for link detection
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function EventChat({ eventId, eventTitle }: EventChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { chat, messages, isLoading } = useEventChat(eventId);
  const sendMessage = useSendMessage();

  // Dev mode profile fallback
  const isDev = true;
  const devProfile = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', display_name: 'Dev User' };
  const activeProfile = profile || (isDev ? devProfile : null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${eventId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !chat?.id) return;

    setUploading(true);
    try {
      let imageUrl: string | null = null;
      
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          toast.error('Failed to upload image');
          setUploading(false);
          return;
        }
      }

      await sendMessage.mutateAsync({ 
        chatId: chat.id, 
        content: newMessage || (imageUrl ? '📷 Photo' : ''),
        imageUrl: imageUrl || undefined,
        messageType: imageUrl ? 'image' : 'text'
      });
      
      setNewMessage('');
      handleRemoveImage();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="font-montserrat">No messages yet</p>
              <p className="text-sm">Be the first to say something!</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === activeProfile?.id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 w-20 object-cover rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
          />
          <Button
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90 shrink-0"
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sendMessage.isPending || uploading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // System messages have a special layout
  const isSystemMessage = message.message_type === 'system';
  
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  // Parse URLs in content
  const renderContent = (content: string) => {
    const parts = content.split(URL_REGEX);
    return parts.map((part, i) => {
      if (URL_REGEX.test(part)) {
        return (
          <a 
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline inline-flex items-center gap-1 ${isOwn ? 'text-white/90' : 'text-primary'}`}
          >
            {part.length > 30 ? part.substring(0, 30) + '...' : part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {message.sender?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <p className="text-xs text-muted-foreground mb-1 px-2">
            {message.sender?.display_name || 'Anonymous'}
          </p>
        )}
        
        {/* Image message */}
        {message.image_url && (
          <div className="mb-1">
            <img 
              src={message.image_url}
              alt="Shared image"
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.image_url!, '_blank')}
            />
          </div>
        )}
        
        {/* Text content */}
        {message.content && message.content !== '📷 Photo' && (
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            }`}
          >
            <p className="text-sm break-words">{renderContent(message.content)}</p>
          </div>
        )}
        
        <p className={`text-[10px] text-muted-foreground mt-1 px-2 ${isOwn ? 'text-right' : 'text-left'}`}>
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
