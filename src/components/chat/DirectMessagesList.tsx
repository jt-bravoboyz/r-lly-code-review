import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';
import { useMyDmChats } from '@/hooks/useDirectMessages';
import { useDirectMessage } from '@/contexts/DirectMessageContext';

export function DirectMessagesList() {
  const { data = [], isLoading } = useMyDmChats();
  const { openDm } = useDirectMessage();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-card/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-3xl bg-white/70 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] backdrop-blur-xl p-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
          <MessageCircle className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-black font-montserrat text-foreground">No DMs yet</h3>
        <p className="text-sm text-muted-foreground">
          Tap <span className="text-primary font-semibold">Message</span> on any R@lly Friend's profile to start a private convo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((row) => (
        <button
          key={row.chat_id}
          onClick={() =>
            openDm({
              otherProfileId: row.other_profile_id,
              chatId: row.chat_id,
              otherProfile: {
                id: row.other_profile_id,
                display_name: row.other_display_name,
                avatar_url: row.other_avatar_url,
              },
            })
          }
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.06] transition-colors text-left"
        >
          <Avatar className="h-12 w-12 ring-1 ring-black/10 dark:ring-white/10 shrink-0">
            <AvatarImage src={row.other_avatar_url || undefined} />
            <AvatarFallback className="bg-[#F47A19]/15 text-[#F47A19] font-black">
              {row.other_display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold text-sm text-foreground truncate">
                {row.other_display_name || 'R@lly Friend'}
              </p>
              {row.last_message_at && (
                <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                  {formatDistanceToNow(new Date(row.last_message_at), { addSuffix: false })}
                </span>
              )}
            </div>
            <p
              className={
                row.unread_count > 0
                  ? 'text-sm text-foreground font-semibold truncate'
                  : 'text-sm text-muted-foreground truncate'
              }
            >
              {row.last_message_text || 'Say hey 👋'}
            </p>
          </div>
          {row.unread_count > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#F47A19] text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(244,122,25,0.5)]">
              {row.unread_count > 9 ? '9+' : row.unread_count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
