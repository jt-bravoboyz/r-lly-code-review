import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConfetti } from '@/hooks/useConfetti';
import { cn } from '@/lib/utils';
import { RecapMediaTile, type RecapMediaItem } from './RecapMediaTile';
import { getRecapCloser } from './recapClosers';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

interface RecapTourProps {
  eventId: string;
  eventTitle: string;
  galleryPhotos: RecapMediaItem[];
  heroVideo?: RecapMediaItem | null;
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
  attendeeCount: number;
  ddCount: number;
  onComplete: () => void;
}

const CALLOUTS = [
  'Mission Complete.',
  'Your Night. Captured.',
  'The Reel Just Dropped.',
  'Best Moment Locked.',
  'Chaos. Documented.',
  'Squad Stars Identified.',
  'Final Frame.',
];

export function RecapTour({
  eventId,
  eventTitle,
  galleryPhotos,
  heroVideo,
  rogueTimeline,
  awards,
  stats,
  attendeeCount,
  ddCount,
  onComplete,
}: RecapTourProps) {
  const [step, setStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { fireRallyConfetti } = useConfetti();
  const closer = getRecapCloser(eventId);

  // Determine which steps exist based on available data
  const steps: Array<'title' | 'gallery' | 'heroVideo' | 'bestPhoto' | 'rogue' | 'stars' | 'finale'> = ['title'];
  if (galleryPhotos.length > 0) steps.push('gallery');
  if (heroVideo) steps.push('heroVideo');
  if (galleryPhotos.length > 0) steps.push('bestPhoto');
  if (rogueTimeline.length > 0) steps.push('rogue');
  if (awards.length > 0) steps.push('stars');
  steps.push('finale'); // always show finale

  const currentStep = steps[step];
  const calloutIndex = step < CALLOUTS.length ? step : CALLOUTS.length - 1;

  const advance = useCallback(() => {
    if (isTransitioning) return;
    if (step >= steps.length - 1) {
      fireRallyConfetti();
      setTimeout(() => onComplete(), 1500);
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setIsTransitioning(false);
    }, 400);
  }, [step, steps.length, isTransitioning, fireRallyConfetti, onComplete]);

  // Prevent scroll during tour
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const heroPhoto = galleryPhotos[0];
  const paparazziAward = awards.find((a) => a.key === 'paparazzi');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-[#0a0a0f] flex items-center justify-center cursor-pointer select-none"
      onClick={advance}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              i <= step ? 'w-6 bg-primary' : 'w-2 bg-white/20'
            )}
          />
        ))}
      </div>

      {/* Callout text */}
      <div
        className={cn(
          'absolute top-14 left-1/2 -translate-x-1/2 z-10 transition-all duration-700',
          isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        )}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80 font-montserrat font-bold">
          {CALLOUTS[calloutIndex]}
        </p>
      </div>

      {/* Content area */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md mx-auto px-6 transition-all duration-700',
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
      >
        {/* Step 1: Title Reveal */}
        {currentStep === 'title' && (
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-montserrat">R@lly Recap</p>
              <h1 className="text-4xl font-bold text-white font-montserrat leading-tight">
                {eventTitle}
              </h1>
              <div className="h-px w-16 bg-primary/60 mx-auto" />
            </div>
            <div className="flex items-center justify-center gap-6 text-white/50 text-sm">
              <span>{attendeeCount} attended</span>
              <span className="text-primary/40">·</span>
              <span>{ddCount} DDs</span>
            </div>
            <p className="text-white/20 text-xs font-montserrat">Tap to continue</p>
          </div>
        )}

        {/* Step 2: Gallery Intro */}
        {currentStep === 'gallery' && galleryPhotos.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.slice(0, 6).map((media, i) => (
                <div
                  key={media.id}
                  className="rounded-xl overflow-hidden ring-1 ring-white/10 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <RecapMediaTile media={media} focalClass="object-[center_25%]" />
                </div>
              ))}
            </div>
            <p className="text-center text-white/60 text-sm font-montserrat">
              📸 {stats.photoCount} photos
              {stats.videoCount ? ` · 🎞️ ${stats.videoCount} clip${stats.videoCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        )}

        {/* Step 2.5: Hero Video */}
        {currentStep === 'heroVideo' && heroVideo && (
          <div className="space-y-4">
            <div className="relative">
              <video
                src={heroVideo.url}
                poster={heroVideo.thumbnail_url || undefined}
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-[3/4] object-cover object-[center_30%] rounded-2xl ring-2 ring-primary/40 shadow-2xl bg-black"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-primary text-xs uppercase tracking-[0.2em] font-montserrat font-bold">
                  🎞️ Final Frame — The reel just dropped
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Best Photo Spotlight */}
        {currentStep === 'bestPhoto' && heroPhoto && (
          <div className="space-y-4">
            <div className="relative">
              {heroPhoto.type === 'video' ? (
                <video
                  src={heroPhoto.url}
                  poster={heroPhoto.thumbnail_url ? getOptimizedImageUrl(heroPhoto.thumbnail_url, { width: 1080, quality: 80 }) : undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full aspect-[3/4] object-cover object-[center_30%] rounded-2xl ring-2 ring-primary/40 shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={getOptimizedImageUrl(heroPhoto.url, { width: 1080, quality: 80 })}
                  alt="Shot of the Night"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full aspect-[3/4] object-cover object-[center_30%] rounded-2xl ring-2 ring-primary/40 shadow-2xl"
                />
              )}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-primary text-xs uppercase tracking-[0.2em] font-montserrat font-bold">
                  ⭐ Shot of the Night
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Rogue Moments */}
        {currentStep === 'rogue' && rogueTimeline.length > 0 && (
          <div className="space-y-4">
            <p className="text-center text-primary/80 text-xs uppercase tracking-[0.2em] font-montserrat font-bold">
              🔥 {rogueTimeline.length} went rogue
            </p>
            <div className="space-y-3">
              {rogueTimeline.slice(0, 3).map((rogue, i) => (
                <div
                  key={rogue.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 animate-fade-in"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8 ring-1 ring-primary/30">
                      <AvatarImage src={rogue.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {rogue.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white/90 text-sm font-semibold">{rogue.displayName}</span>
                  </div>
                  {rogue.finalWords && (
                    <p className="text-white/50 text-sm italic pl-11">"{rogue.finalWords}"</p>
                  )}
                  {Object.keys(rogue.reactionCounts).length > 0 && (
                    <div className="flex gap-2 pl-11 mt-2">
                      {Object.entries(rogue.reactionCounts).map(([emoji, count]) => (
                        <span key={emoji} className="text-xs text-white/40">
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Squad Stars */}
        {currentStep === 'stars' && awards.length > 0 && (
          <div className="space-y-4">
            <p className="text-center text-primary/80 text-xs uppercase tracking-[0.2em] font-montserrat font-bold">
              🏆 Squad Stars
            </p>
            <div className="space-y-3">
              {awards.map((award, i) => (
                <div
                  key={award.key}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <span className="text-3xl">{award.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/40 text-xs uppercase tracking-wide font-montserrat">{award.title}</p>
                    <p className="text-white font-bold truncate">{award.winnerName}</p>
                  </div>
                  <Avatar className="h-10 w-10 ring-1 ring-white/10">
                    <AvatarImage src={award.winnerAvatar || undefined} />
                    <AvatarFallback className="text-xs bg-white/5 text-white/60">
                      {award.winnerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Finale */}
        {currentStep === 'finale' && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center ring-4 ring-primary/20">
                <span className="text-2xl">{closer.emoji}</span>
              </div>
              <p className="text-white font-bold font-montserrat text-lg">{closer.title}</p>
              <p className="text-white/30 text-xs font-montserrat uppercase tracking-widest">
                {closer.subtitle}
              </p>
            </div>

            <p className="text-white/15 text-[10px] font-montserrat pt-4">Tap to finish</p>
          </div>
        )}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
    </div>,
    document.body
  );
}
