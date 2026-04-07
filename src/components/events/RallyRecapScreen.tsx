import { useState } from 'react';
import { ShieldCheck, Share2, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRecapData } from '@/hooks/useRecapData';
import { toast } from 'sonner';
import { PUBLIC_APP_URL } from '@/lib/appUrl';

interface RallyRecapScreenProps {
  eventId: string;
  eventTitle: string;
  eventType: string;
  attendeeCount: number;
  ddCount: number;
}

export function RallyRecapScreen({ eventId, eventTitle, eventType, attendeeCount, ddCount }: RallyRecapScreenProps) {
  const { rogueTimeline, galleryPhotos, awards, stats, isLoading } = useRecapData(eventId);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const displayPhotos = showAllPhotos ? galleryPhotos : galleryPhotos.slice(0, 6);

  const handleShare = async () => {
    const text = `🐴 Mission Accomplished.\n\n"${eventTitle}" R@lly Recap:\n📸 ${stats.photoCount} Photos | 🔥 ${stats.rogueCount} Rogues | 💬 ${stats.reactionCount} Reactions\n\n100% SECURED. THE HORSE IS BACK IN THE STABLE.\n\nPowered by R@lly`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `${eventTitle} — R@lly Recap`, text, url: `${PUBLIC_APP_URL}/events/${eventId}` });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Recap copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Section 1 — Hero Header */}
      <section className="space-y-3">
        {galleryPhotos.length > 0 && (
          <div className="relative">
            <img
              src={galleryPhotos[0].url}
              alt="Shot of the Night"
              className="w-full h-56 object-cover rounded-2xl ring-4 ring-yellow-400 shadow-lg"
            />
            <div className="absolute top-3 left-3 bg-yellow-400 text-black text-xs font-bold px-2.5 py-1 rounded-full font-montserrat">
              ⭐ Shot of the Night
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="flex items-center justify-center gap-4 backdrop-blur-xl bg-card/60 border border-border/50 rounded-xl px-4 py-3">
          <span className="text-sm font-medium">📸 {stats.photoCount}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-medium">🔥 {stats.rogueCount}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-medium">💬 {stats.reactionCount}</span>
        </div>
      </section>

      {/* Section 2 — Rogue Timeline (Midnight Theme) */}
      {rogueTimeline.length > 0 && (
        <section className="rounded-2xl bg-[#1a1a2e] px-4 py-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-orange-400 font-montserrat">
            🔥 Rogue Timeline
          </h3>
          {rogueTimeline.map((moment, i) => (
            <div
              key={moment.id}
              className="bg-white/5 rounded-xl p-3.5 space-y-2 animate-fade-in"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-2 ring-orange-500/50">
                  <AvatarImage src={moment.avatarUrl || undefined} />
                  <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs">
                    {moment.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white font-semibold text-sm">{moment.displayName}</span>
                <span className="text-white/40 text-xs ml-auto">went rogue</span>
              </div>

              {moment.finalWords && (
                <div className="bg-white/10 border-l-2 border-orange-500 rounded-r-lg px-3 py-2">
                  <p className="text-white/80 text-sm italic">"{moment.finalWords}"</p>
                </div>
              )}

              {Object.keys(moment.reactionCounts).length > 0 && (
                <div className="flex gap-2 pt-1">
                  {Object.entries(moment.reactionCounts).map(([emoji, count]) => (
                    <span key={emoji} className="bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/70">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Section 3 — Cinematic Photo Bundle */}
      {galleryPhotos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground font-montserrat">
              Photo Bundle
            </h3>
          </div>
          <div className="columns-2 gap-3 space-y-3">
            {displayPhotos.map((photo) => (
              <div key={photo.id} className="break-inside-avoid relative group">
                <img
                  src={photo.url}
                  alt="Rally photo"
                  className="w-full rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-2 left-2 backdrop-blur-md bg-white/20 rounded-full px-2 py-0.5">
                  <span className="text-[10px] text-white font-medium drop-shadow-sm">
                    📷
                  </span>
                </div>
              </div>
            ))}
          </div>
          {galleryPhotos.length > 6 && !showAllPhotos && (
            <Button
              variant="outline"
              size="sm"
              className="w-full font-montserrat"
              onClick={() => setShowAllPhotos(true)}
            >
              View All ({galleryPhotos.length} photos)
            </Button>
          )}
        </section>
      )}

      {/* Section 4 — Squad Stars (Awards) */}
      {awards.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground font-montserrat">
            🏆 Squad Stars
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {awards.map((award, i) => (
              <div
                key={award.key}
                className="backdrop-blur-xl bg-card/60 border border-border/50 rounded-xl p-4 flex items-center gap-4 animate-fade-in"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <span className="text-3xl">{award.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-montserrat uppercase tracking-wide">{award.title}</p>
                  <p className="font-bold text-foreground">{award.winnerName}</p>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={award.winnerAvatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {award.winnerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 5 — Safe & Sound Finale */}
      <section className="rounded-2xl bg-card/50 border border-border/50 p-6 space-y-4 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg ring-4 ring-yellow-400/30">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>

        <div className="space-y-1">
          <p className="text-xl font-bold font-montserrat text-yellow-500">
            🐴 Mission Accomplished.
          </p>
          <p className="text-sm font-bold text-foreground font-montserrat">
            100% SECURED. THE HORSE IS BACK IN THE STABLE.
          </p>
          <p className="text-xs text-muted-foreground">
            {attendeeCount} confirmed · {ddCount} DDs deployed
          </p>
        </div>

        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-primary to-primary/80 font-montserrat font-bold"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share to Story
        </Button>

        <p className="text-[10px] text-muted-foreground font-montserrat pt-2 border-t border-border/30">
          Powered by R@lly
        </p>
      </section>
    </div>
  );
}
