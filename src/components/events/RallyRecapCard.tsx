import { Users, Car, ShieldCheck, Flame } from 'lucide-react';
import { getEventTypeEmoji, getEventTypeVibe } from '@/lib/eventTypes';

const VIBE_GRADIENTS: Record<string, string> = {
  orange: 'from-primary/20 to-primary/10',
  purple: 'from-purple-500/20 to-purple-600/10',
  green: 'from-green-500/20 to-green-600/10',
  blue: 'from-blue-500/20 to-blue-600/10',
  red: 'from-red-500/20 to-red-600/10',
  default: 'from-muted/30 to-muted/10',
};

interface RogueMoment {
  displayName: string;
  finalWords: string | null;
  reactions: Record<string, number>;
}

interface RallyRecapCardProps {
  eventTitle: string;
  eventType: string;
  attendeeCount: number;
  ddCount: number;
  rogueMoments?: RogueMoment[];
}

export function RallyRecapCard({ eventTitle, eventType, attendeeCount, ddCount, rogueMoments }: RallyRecapCardProps) {
  const emoji = getEventTypeEmoji(eventType);
  const vibe = getEventTypeVibe(eventType);
  const gradient = VIBE_GRADIENTS[vibe] ?? VIBE_GRADIENTS.default;

  return (
    <div className={`w-full rounded-xl bg-gradient-to-br ${gradient} border border-border/50 p-5 space-y-3`}>
      {/* Title */}
      <div className="text-center">
        {emoji && <span className="text-2xl">{emoji}</span>}
        <h3 className="text-lg font-bold font-montserrat text-foreground mt-1">{eventTitle}</h3>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span>{attendeeCount} confirmed</span>
        </div>
        {ddCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Car className="h-4 w-4 text-primary shrink-0" />
            <span>{ddCount} DDs deployed</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Everyone made it home safe ✅</span>
        </div>
      </div>

      {/* Rogue Moments */}
      {rogueMoments && rogueMoments.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary font-montserrat">
            <Flame className="h-4 w-4" />
            <span>Rogue Moments</span>
          </div>
          {rogueMoments.map((moment, i) => (
            <div key={i} className="bg-background/50 rounded-lg p-2.5 space-y-1">
              <p className="text-sm font-medium text-foreground">
                🔥 {moment.displayName} went rogue!
              </p>
              {moment.finalWords && (
                <p className="text-xs italic text-muted-foreground">"{moment.finalWords}"</p>
              )}
              {Object.keys(moment.reactions).length > 0 && (
                <div className="flex gap-2">
                  {Object.entries(moment.reactions).map(([emoji, count]) => (
                    <span key={emoji} className="text-xs text-muted-foreground">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Branding */}
      <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/30 font-montserrat">
        Powered by R@lly
      </p>
    </div>
  );
}
