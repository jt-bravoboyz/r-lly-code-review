import { useMemo, useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { Message, MessageReaction, MessageRead } from './types';
import { MiniFounderGem } from '@/components/badges/MiniFounderGem';
import { getPublicName } from '@/lib/identity';
import { usePublicProfile } from '@/contexts/PublicProfileContext';
import { ReactionBar } from './ReactionBar';
import { ImageLightbox } from './ImageLightbox';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { openExternalLink } from '@/lib/nativeLinks';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface Props {
  message: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isFresh: boolean;
  reactions: MessageReaction[];
  reads: MessageRead[];
  readers: Array<{ profile_id: string; avatar_url?: string | null; name: string }>;
  onToggleReaction: (emoji: string) => void;
  onVisible: () => void;
  showSenderName: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  isFresh,
  reactions,
  readers,
  onToggleReaction,
  onVisible,
  showSenderName,
}: Props) {
  const { openProfile } = usePublicProfile();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reactionRect, setReactionRect] = useState<DOMRect | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // System message
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-foreground/5 backdrop-blur-md border border-border/40 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  // IntersectionObserver for read receipts
  useEffect(() => {
    if (isOwn || !bubbleRef.current) return;
    const el = bubbleRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            timer = setTimeout(() => onVisible(), 800);
          } else if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [isOwn, onVisible]);

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleRef.current) {
        setReactionRect(bubbleRef.current.getBoundingClientRect());
        setShowStamp(true);
        setTimeout(() => setShowStamp(false), 2200);
      }
    }, 450);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const senderName = getPublicName(message.sender as any);

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
            className={cn(
              'underline inline-flex items-center gap-1',
              isOwn ? 'text-white/95' : 'text-primary'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (Capacitor.isNativePlatform()) {
                e.preventDefault();
                void openExternalLink(part);
              }
            }}
          >
            {part.length > 30 ? part.substring(0, 30) + '…' : part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return part;
    });
  };

  // Group reactions by emoji
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    reactions.forEach((r) => {
      map[r.emoji] = (map[r.emoji] || 0) + 1;
    });
    return Object.entries(map);
  }, [reactions]);

  // Bubble corner radii
  const radius = isOwn
    ? cn(
        'rounded-2xl',
        isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md',
        isLastInGroup ? 'rounded-br-md' : 'rounded-br-md'
      )
    : cn(
        'rounded-2xl',
        isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md',
        isLastInGroup ? 'rounded-bl-md' : 'rounded-bl-md'
      );

  const bubbleSurface = isOwn
    ? 'bg-primary/[0.18] border border-primary/35 text-foreground dark:text-white backdrop-blur-md'
    : 'bg-foreground/[0.06] dark:bg-white/[0.08] border border-border/50 dark:border-white/10 text-foreground backdrop-blur-md';

  return (
    <div
      className={cn(
        'flex items-end gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isFirstInGroup ? 'mt-2' : 'mt-0.5'
      )}
    >
      {/* Avatar slot - only on last in group, not own */}
      <div className="w-8 shrink-0">
        {!isOwn && isLastInGroup && (
          <button
            type="button"
            onClick={() => message.sender_id && openProfile(message.sender_id)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            aria-label={`View ${senderName}'s profile`}
          >
            <Avatar className="h-8 w-8 ring-1 ring-border/60">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </div>

      <div className={cn('max-w-[75%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && showSenderName && isFirstInGroup && (
          <p className="text-[11px] text-muted-foreground mb-1 px-3 inline-flex items-center">
            <button
              type="button"
              onClick={() => message.sender_id && openProfile(message.sender_id)}
              className="hover:underline"
            >
              {senderName}
            </button>
            <MiniFounderGem profileId={message.sender_id} />
          </p>
        )}

        <div
          ref={bubbleRef}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            if (bubbleRef.current) {
              setReactionRect(bubbleRef.current.getBoundingClientRect());
            }
          }}
          className={cn(
            'relative px-4 py-2.5 select-none',
            radius,
            bubbleSurface,
            'shadow-sm transition-all',
            isFresh && 'animate-[bubble-in_250ms_cubic-bezier(.34,1.36,.64,1)]',
            isFresh && isOwn && 'ring-2 ring-primary/40 ring-offset-0'
          )}
          style={{ wordBreak: 'break-word' }}
        >
          {message.image_url && (
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="block -mx-2 -mt-1 mb-1 overflow-hidden rounded-xl"
            >
              <img
                src={message.image_url}
                alt="Shared"
                loading="lazy"
                className="max-w-full max-h-72 object-cover"
              />
            </button>
          )}

          {message.content && message.content !== '📷 Photo' && (
            <p className="text-sm leading-relaxed break-words">
              {renderContent(message.content)}
            </p>
          )}

          {grouped.length > 0 && (
            <div
              className={cn(
                'absolute -bottom-3 flex gap-0.5 px-1.5 py-0.5 rounded-full bg-background/90 backdrop-blur-md border border-border/60 shadow-sm text-[11px]',
                isOwn ? 'left-2' : 'right-2'
              )}
            >
              {grouped.map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  className="flex items-center gap-0.5 hover:scale-110 transition-transform"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-muted-foreground">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {showStamp && (
          <p className="text-[10px] text-muted-foreground mt-1 px-2 animate-fade-in">
            {format(new Date(message.created_at), 'MMM d, h:mm a')}
          </p>
        )}

        {/* Read receipts (only for own messages on last in group) */}
        {isOwn && isLastInGroup && readers.length > 0 && (
          <div className="flex -space-x-1 mt-1 mr-1">
            {readers.slice(0, 3).map((r) => (
              <Avatar key={r.profile_id} className="h-4 w-4 ring-1 ring-background">
                <AvatarImage src={r.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                  {r.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>

      {reactionRect && (
        <ReactionBar
          anchorRect={reactionRect}
          onPick={onToggleReaction}
          onClose={() => setReactionRect(null)}
        />
      )}

      {lightbox && message.image_url && (
        <ImageLightbox src={message.image_url} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
