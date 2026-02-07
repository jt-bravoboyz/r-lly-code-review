import { Moon, MapPin, Check, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AfterRallyCardProps {
  eventId: string;
  afterRallyLocation?: string | null;
  afterRallyLat?: number | null;
  afterRallyLng?: number | null;
  isOptedIn: boolean;
  onJoinClick: () => void;
  isLoading?: boolean;
}

export function AfterRallyCard({
  afterRallyLocation,
  afterRallyLat,
  afterRallyLng,
  isOptedIn,
  onJoinClick,
  isLoading = false,
}: AfterRallyCardProps) {
  const hasLocation = !!afterRallyLocation;
  
  const handleGetDirections = () => {
    if (afterRallyLat && afterRallyLng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${afterRallyLat},${afterRallyLng}`,
        '_blank'
      );
    } else if (afterRallyLocation) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(afterRallyLocation)}`,
        '_blank'
      );
    }
  };

  return (
    <section className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-900/95 via-purple-800/90 to-indigo-900/95 border-purple-500/30 shadow-xl shadow-purple-900/20 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-purple-400/20 flex items-center justify-center">
                <Moon className="h-5 w-5 text-purple-200" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg font-montserrat">After R@lly</h3>
                <p className="text-purple-200/80 text-sm font-montserrat">The night continues</p>
              </div>
            </div>
            
            {isOptedIn && (
              <Badge className="bg-green-500/20 text-green-300 border-green-400/30 px-3 py-1">
                <Check className="h-3.5 w-3.5 mr-1" />
                You're In!
              </Badge>
            )}
          </div>

          {/* Location */}
          {hasLocation && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-950/50 border border-purple-500/20">
              <MapPin className="h-5 w-5 text-purple-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300/70 uppercase tracking-wide font-medium">Next Stop</p>
                <p className="text-white font-medium truncate">{afterRallyLocation}</p>
              </div>
            </div>
          )}

          {!hasLocation && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-950/50 border border-purple-500/20">
              <span className="text-lg">✨</span>
              <p className="text-purple-200 text-sm">The after party continues! Check with the group for details.</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!isOptedIn ? (
              <Button
                onClick={onJoinClick}
                disabled={isLoading}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold shadow-lg shadow-purple-900/30"
              >
                <Moon className="h-4 w-4 mr-2" />
                Join After R@lly
              </Button>
            ) : hasLocation && (
              <Button
                variant="outline"
                onClick={handleGetDirections}
                className="w-full border-purple-400/40 text-purple-100 hover:bg-purple-800/50 hover:text-white"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
