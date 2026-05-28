import { useMemo, useState } from 'react';
import { shareContent, copyToClipboard } from '@/lib/nativeShare';
import { Camera, Share2, ShieldCheck, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { buildRallyShareUrl } from '@/lib/shareUrls';
import { cn } from '@/lib/utils';
import { RecapMediaTile, type RecapMediaItem } from './RecapMediaTile';
import { getRecapCloser } from './recapClosers';
import { useRogueAlerts } from '@/hooks/useRogueAlerts';
import { AwardWinners } from './AwardWinners';

const REACTION_EMOJIS = ['🤮', '😍', '🍆'];

interface RecapTimelineProps {
  eventId: string;
  eventTitle: string;
  attendeeCount: number;
  ddCount: number;
  galleryPhotos: RecapMediaItem[];
  rogueTimeline: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    finalWords: string | null;
    createdAt: string;
    reactionCounts: Record<string, number>;
  }>;
  awards: Array<{
    key: string;
    emoji: string;
    title: string;
    winnerName: string;
    winnerAvatar: string | null;
  }>;
  stats: { photoCount: number; videoCount?: number; rogueCount: number; reactionCount: number };
}

export function RecapTimeline({
  eventId,
  eventTitle,
  attendeeCount,
  ddCount,
  galleryPhotos,
  rogueTimeline,
  awards,
  stats,
}: RecapTimelineProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const closer = useMemo(() => getRecapCloser(eventId), [eventId]);
  const { submitReaction } = useRogueAlerts(eventId);

  const displayPhotos = showAllPhotos ? galleryPhotos : galleryPhotos.slice(0, 6);
  const hero = galleryPhotos[0];
  const videoCount = stats.videoCount ?? 0;

  const handleShare = async () => {
    const text = `${closer.emoji} ${closer.title}\n\n"${eventTitle}" R@lly Recap:\n📸 ${stats.photoCount} Photos${videoCount ? ` · 🎞️ ${videoCount} Clips` : ''} | 🔥 ${stats.rogueCount} Rogues | 💬 ${stats.reactionCount} Reactions\n\n${closer.share.toUpperCase()}\n\nPowered by R@lly`;
    if ((true /* shareContent */)) {
      try {
        await shareContent({ title: `${eventTitle} — R@lly Recap`, text, url: buildRallyShareUrl({ eventId }) });
      } catch { /* cancelled */ }
    } else {
      await copyToClipboard(text);
      toast.success('Recap copied to clipboard!');
    }
  };

  const handleReact = (alertId: string, emoji: string) => {
    submitReaction.mutate({ alertId, emoji });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Title */}
      <section className="text-center space-y-3 pt-2">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-montserrat font-bold">R@lly Recap</p>
        <h2 className="text-2xl font-bold text-foreground font-montserrat">{eventTitle}</h2>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>📸 {stats.photoCount}</span>
          {videoCount > 0 && (
            <>
              <span className="text-border">|</span>
              <span>🎞️ {videoCount}</span>
            </>
          )}
          <span className="text-border">|</span>
          <span>🔥 {stats.rogueCount}</span>
          <span className="text-border">|</span>
          <span>💬 {stats.reactionCount}</span>
        </div>
      </section>

      {/* Hero Media (photo or video) */}
      {hero && (
        <section>
          <div className="relative">
            {hero.type === 'video' ? (
              <video
                src={hero.url}
                poster={hero.thumbnail_url || undefined}
                controls
                playsInline
                preload="none"
                className="w-full aspect-[4/5] object-cover rounded-2xl ring-2 ring-primary/30 shadow-lg bg-gradient-to-br from-muted via-muted/80 to-muted/60"
              />
            ) : (
              <img
                src={hero.url}
                alt="Shot of the Night"
                className="w-full aspect-[4/5] object-cover rounded-2xl ring-2 ring-primary/30 shadow-lg"
              />
            )}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4">
              <span className="bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full font-montserrat">
                {hero.type === 'video' ? '🎞️ Final Frame' : '⭐ Shot of the Night'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Photo + Video Bundle */}
      {galleryPhotos.length > 1 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground font-montserrat">
              Photo Bundle
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {displayPhotos.slice(1).map((media) => (
              <RecapMediaTile
                key={media.id}
                media={media}
                className="rounded-xl ring-1 ring-border/30"
              />
            ))}
          </div>
          {galleryPhotos.length > 7 && !showAllPhotos && (
            <Button
              variant="outline"
              size="sm"
              className="w-full font-montserrat text-xs"
              onClick={() => setShowAllPhotos(true)}
            >
              View All ({galleryPhotos.length} items)
            </Button>
          )}
        </section>
      )}

      {/* Rogue Timeline — with inline tap-to-react */}
      {rogueTimeline.length > 0 && (
        <section className="rounded-2xl bg-[#0e0e1a] px-4 py-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 font-montserrat">
            🔥 Rogue Timeline
          </h3>
          {rogueTimeline.map((moment, i) => (
            <div
              key={moment.id}
              className={cn(
                'bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                  <AvatarImage src={moment.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {moment.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/90 font-semibold text-sm">{moment.displayName}</span>
                <span className="text-white/25 text-xs ml-auto">went rogue</span>
              </div>
              {moment.finalWords && (
                <div className="bg-white/[0.04] border-l-2 border-primary/40 rounded-r-lg px-3 py-2 ml-11">
                  <p className="text-white/60 text-sm italic">"{moment.finalWords}"</p>
                </div>
              )}
              {/* Inline reaction bar — late reactions still count */}
              <div className="flex gap-2 ml-11 flex-wrap">
                {REACTION_EMOJIS.map((emoji) => {
                  const count = moment.reactionCounts[emoji] || 0;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(moment.id, emoji)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
                        'bg-white/[0.06] hover:bg-primary/20 border border-white/[0.06] hover:border-primary/40',
                        'text-white/70 hover:text-white transition-all active:scale-95'
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-white/50">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Hall of Fame — auto-renders for Drunkies recap */}
      <AwardWinners eventId={eventId} eventTitle={eventTitle} />

      {/* Squad Stars */}
      {awards.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground font-montserrat">
            🏆 Squad Stars
          </h3>
          <div className="space-y-2.5">
            {awards.map((award, i) => (
              <div
                key={award.key}
                className="backdrop-blur-xl bg-card/50 border border-border/40 rounded-xl p-4 flex items-center gap-4 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-2xl">{award.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-montserrat uppercase tracking-wide">{award.title}</p>
                  <p className="font-bold text-foreground text-sm truncate">{award.winnerName}</p>
                </div>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={award.winnerAvatar || undefined} />
                  <AvatarFallback className="text-xs">{award.winnerName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closer */}
      <section className="rounded-2xl bg-card/40 border border-border/30 p-6 space-y-4 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary/50 flex items-center justify-center shadow-lg ring-4 ring-primary/20">
          <ShieldCheck className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold font-montserrat text-primary">{closer.emoji} {closer.title}</p>
          <p className="text-xs font-bold text-foreground font-montserrat uppercase tracking-wide">
            {closer.subtitle}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {attendeeCount} confirmed · {ddCount} DDs deployed
          </p>
        </div>
        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-primary to-primary/80 font-montserrat font-bold text-sm"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Recap
        </Button>
        <p className="text-[10px] text-muted-foreground/50 font-montserrat pt-1 border-t border-border/20">
          Powered by R@lly
        </p>
      </section>
    </div>
  );
}
