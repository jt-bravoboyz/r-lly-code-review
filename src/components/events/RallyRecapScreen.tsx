import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useRecapData } from '@/hooks/useRecapData';
import { useVideoThumbnailBackfill } from '@/hooks/useVideoThumbnailBackfill';
import { RecapTour } from './recap/RecapTour';
import { RecapTimeline } from './recap/RecapTimeline';

interface RallyRecapScreenProps {
  eventId: string;
  eventTitle: string;
  eventType: string;
  attendeeCount: number;
  ddCount: number;
}

const TOUR_KEY_PREFIX = 'rally_recap_toured_';

export function RallyRecapScreen({ eventId, eventTitle, eventType, attendeeCount, ddCount }: RallyRecapScreenProps) {
  const { rogueTimeline, galleryPhotos, heroVideo, awards, stats, isLoading } = useRecapData(eventId);

  // Heal blank video tiles on mobile by generating any missing thumbnails
  // the first time anyone opens the recap on a real device.
  useVideoThumbnailBackfill(eventId, galleryPhotos);

  const [hasSeenTour, setHasSeenTour] = useState(() => {
    return localStorage.getItem(`${TOUR_KEY_PREFIX}${eventId}`) === 'true';
  });
  const [showTour, setShowTour] = useState(!hasSeenTour);

  const handleTourComplete = useCallback(() => {
    localStorage.setItem(`${TOUR_KEY_PREFIX}${eventId}`, 'true');
    setHasSeenTour(true);
    setShowTour(false);
  }, [eventId]);

  const handleReplay = useCallback(() => {
    setShowTour(true);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Tour overlay */}
      {showTour && (
        <RecapTour
          eventId={eventId}
          eventTitle={eventTitle}
          galleryPhotos={galleryPhotos}
          heroVideo={heroVideo}
          rogueTimeline={rogueTimeline}
          awards={awards}
          stats={stats}
          attendeeCount={attendeeCount}
          ddCount={ddCount}
          onComplete={handleTourComplete}
        />
      )}

      {/* Replay button — only visible in timeline mode */}
      {!showTour && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-montserrat"
            aria-label="Replay recap tour"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </button>
        </div>
      )}

      {/* Persistent Timeline */}
      {!showTour && (
        <RecapTimeline
          eventId={eventId}
          eventTitle={eventTitle}
          attendeeCount={attendeeCount}
          ddCount={ddCount}
          galleryPhotos={galleryPhotos}
          rogueTimeline={rogueTimeline}
          awards={awards}
          stats={stats}
        />
      )}
    </div>
  );
}
