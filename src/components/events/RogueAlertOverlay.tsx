import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';

interface RogueAlertOverlayProps {
  alert: {
    id: string;
    final_words: string | null;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  reactionCounts: Record<string, number>;
  onReact: (emoji: string) => void;
  onDismiss: () => void;
  /** When >1, indicates more rogue alerts are stacked behind this one. */
  queueCount?: number;
}

const REACTION_EMOJIS = ['🤮', '😍', '🍆'];

export function RogueAlertOverlay({ alert, reactionCounts, onReact, onDismiss, queueCount = 1 }: RogueAlertOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleDismiss}
    >
      <div
        className={`relative max-w-sm w-full mx-4 rounded-2xl bg-card border border-primary/50 p-6 space-y-4 shadow-2xl transition-all duration-500 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.4)' }}
      >
        {/* Rogue Badge */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scale-in">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center pt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary font-montserrat">
            🔥 ROGUE ALERT 🔥
          </p>
          <Avatar className="h-16 w-16 mx-auto ring-2 ring-primary/50">
            <AvatarImage src={alert.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xl">
              {alert.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-bold font-montserrat text-foreground">
            {alert.profile?.display_name || 'Someone'} has gone rogue!
          </h3>
        </div>

        {/* Final Words */}
        {alert.final_words && (
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm italic text-foreground">"{alert.final_words}"</p>
          </div>
        )}

        {/* Reaction Bar */}
        <div className="flex justify-center gap-4 pt-2">
          {REACTION_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              className="h-14 w-14 text-2xl rounded-full border-border/50 hover:border-primary hover:bg-primary/10 transition-transform active:scale-[0.9]"
              onClick={() => onReact(emoji)}
            >
              <span>{emoji}</span>
              {(reactionCounts[emoji] || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {reactionCounts[emoji]}
                </span>
              )}
            </Button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Tap outside or wait to dismiss
        </p>
      </div>
    </div>
  );
}
