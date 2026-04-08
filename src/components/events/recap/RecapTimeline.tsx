import { useState } from 'react';
import { Camera, Share2, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { cn } from '@/lib/utils';

interface RecapTimelineProps {
  eventId: string;
  eventTitle: string;
  attendeeCount: number;
  ddCount: number;
  galleryPhotos: Array<{ id: string; url: string }>;
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
  stats: { photoCount: number; rogueCount: number; reactionCount: number };
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
  const displayPhotos = showAllPhotos ? galleryPhotos : galleryPhotos.slice(0, 6);

  const handleShare = async () => {
    const text = `🐴 Mission Accomplished.\n\n"${eventTitle}" R@lly Recap:\n📸 ${stats.photoCount} Photos | 🔥 ${stats.rogueCount} Rogues | 💬 ${stats.reactionCount} Reactions\n\n100% SECURED. THE HORSE IS BACK IN THE STABLE.\n\nPowered by R@lly`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${eventTitle} — R@lly Recap`, text, url: `${PUBLIC_APP_URL}/events/${eventId}` });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Recap copied to clipboard!');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Title */}
      <section className="text-center space-y-3 pt-2">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-montserrat font-bold">R@lly Recap</p>
        <h2 className="text-2xl font-bold text-foreground font-montserrat">{eventTitle}</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>📸 {stats.photoCount}</span>
          <span className="text-border">|</span>
          <span>🔥 {stats.rogueCount}</span>
          <span className="text-border">|</span>
          <span>💬 {stats.reactionCount}</span>
        </div>
      </section>

      {/* Hero Photo */}
      {galleryPhotos.length > 0 && (
        <section>
          <div className="relative">
            <img
              src={galleryPhotos[0].url}
              alt="Shot of the Night"
              className="w-full aspect-[4/5] object-cover rounded-2xl ring-2 ring-primary/30 shadow-lg"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full font-montserrat">
                ⭐ Shot of the Night
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Photo Bundle */}
      {galleryPhotos.length > 1 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground font-montserrat">
              Photo Bundle
            </h3>
          </div>
          <div className="columns-2 gap-2.5 space-y-2.5">
            {displayPhotos.slice(1).map((photo) => (
              <div key={photo.id} className="break-inside-avoid">
                <img
                  src={photo.url}
                  alt=""
                  className="w-full rounded-xl object-cover ring-1 ring-border/30"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {galleryPhotos.length > 7 && !showAllPhotos && (
            <Button
              variant="outline"
              size="sm"
              className="w-full font-montserrat text-xs"
              onClick={() => setShowAllPhotos(true)}
            >
              View All ({galleryPhotos.length} photos)
            </Button>
          )}
        </section>
      )}

      {/* Rogue Timeline */}
      {rogueTimeline.length > 0 && (
        <section className="rounded-2xl bg-[#0e0e1a] px-4 py-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 font-montserrat">
            🔥 Rogue Timeline
          </h3>
          {rogueTimeline.map((moment, i) => (
            <div
              key={moment.id}
              className={cn(
                'bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2',
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
              {Object.keys(moment.reactionCounts).length > 0 && (
                <div className="flex gap-2 ml-11">
                  {Object.entries(moment.reactionCounts).map(([emoji, count]) => (
                    <span key={emoji} className="bg-white/[0.06] rounded-full px-2.5 py-0.5 text-xs text-white/50">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

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

      {/* Safe & Sound Finale */}
      <section className="rounded-2xl bg-card/40 border border-border/30 p-6 space-y-4 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary/50 flex items-center justify-center shadow-lg ring-4 ring-primary/20">
          <ShieldCheck className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold font-montserrat text-primary">🐴 Mission Accomplished.</p>
          <p className="text-xs font-bold text-foreground font-montserrat uppercase tracking-wide">
            100% Secured. The horse is back in the stable.
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
