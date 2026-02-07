import { useRef, useEffect, useMemo } from 'react';
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

// Constants for full 24-hour range
const STEPS = 96; // 96 positions (0-95 = times, 96 = open-ended)

interface TimelineSliderProps {
  value: string; // "HH:mm" format (e.g., "21:30") or "open"
  onChange: (value: string) => void;
  selectedDate?: Date; // For blocking past times
  className?: string;
}

// Convert slider value (0-96) to time string ("HH:mm" or "open")
function sliderToTime(value: number): string {
  if (value >= STEPS) return 'open'; // Position 96 = "Until we're done"
  const totalMinutes = value * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Convert time string ("HH:mm" or "open") to slider value (0-96)
function timeToSlider(time: string): number {
  if (!time || time === 'open') return STEPS; // Return max for open-ended
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 80; // Default to 8 PM (position 80)
  const sliderValue = (hours * 60 + minutes) / 15;
  return Math.max(0, Math.min(STEPS, sliderValue));
}

// Format time for display (e.g., "9:30 PM" or "Until we're done")
function formatTimeDisplay(time: string): string {
  if (!time || time === 'open') return "Until we're done";
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '8:00 PM';
  
  const period = hours >= 12 && hours < 24 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Calculate minimum slider value based on current time
function getMinSliderValue(selectedDate: Date | undefined): number {
  if (!selectedDate) return 0;
  
  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  
  if (!isToday) return 0; // No restriction for future dates
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const bufferMinutes = 15;
  const minPosition = Math.ceil((currentMinutes + bufferMinutes) / 15);
  
  return Math.max(0, Math.min(STEPS, minPosition));
}

// Hour labels for the timeline (minimal, readable)
const HOUR_LABELS = [
  { position: 0, label: '12AM' },
  { position: 24, label: '6AM' },
  { position: 48, label: '12PM' },
  { position: 72, label: '6PM' },
  { position: 96, label: '∞' },
];

// Quick labels with positions
const QUICK_LABELS = [
  { start: 0, end: 24, label: 'Morning', center: 12 },
  { start: 24, end: 48, label: 'Afternoon', center: 36 },
  { start: 48, end: 72, label: 'Evening', center: 60 },
  { start: 72, end: 96, label: 'Night', center: 84 },
];

export function TimelineSlider({ value, onChange, selectedDate, className }: TimelineSliderProps) {
  const { triggerHaptic } = useHaptics();
  const lastHourRef = useRef<number>(-1);
  const sliderValue = timeToSlider(value);
  const minValue = useMemo(() => getMinSliderValue(selectedDate), [selectedDate]);
  
  // Auto-adjust if current value is below minimum (but not for 'open')
  useEffect(() => {
    if (value !== 'open' && sliderValue < minValue) {
      onChange(sliderToTime(minValue));
    }
  }, [minValue, sliderValue, onChange, value]);

  const handleValueChange = (values: number[]) => {
    const newValue = values[0];
    // Enforce minimum (allow max for "open")
    const clampedValue = newValue >= STEPS ? STEPS : Math.max(newValue, minValue);
    const time = sliderToTime(clampedValue);
    
    // Trigger haptic when crossing an hour boundary (every 4 positions = 1 hour)
    if (time !== 'open') {
      const [hours] = time.split(':').map(Number);
      if (hours !== lastHourRef.current && clampedValue % 4 === 0) {
        triggerHaptic('selection');
        lastHourRef.current = hours;
      }
    } else if (clampedValue === STEPS && value !== 'open') {
      // Haptic when reaching "Until we're done"
      triggerHaptic('selection');
    }
    
    onChange(time);
  };

  // Calculate past overlay width
  const pastOverlayWidth = minValue > 0 ? (minValue / STEPS) * 100 : 0;
  const isOpenEnded = value === 'open' || sliderValue >= STEPS;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Time Display */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">Rally Start Time</span>
        <div className={cn(
          "text-3xl font-bold font-montserrat",
          isOpenEnded ? "text-primary" : "text-foreground"
        )}>
          {formatTimeDisplay(value)}
        </div>
      </div>

      {/* Slider Track with Tick Marks */}
      <div className="relative pt-2 pb-6">
        {/* Hour tick marks - positioned above the slider */}
        <div className="absolute top-0 left-0 right-0 h-3 flex justify-between px-[10px]">
          {HOUR_LABELS.map((hour) => (
            <div
              key={hour.position}
              className="flex flex-col items-center"
              style={{
                position: 'absolute',
                left: `${(hour.position / STEPS) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className={cn(
                "w-0.5 bg-muted-foreground/50",
                "h-3"
              )} />
            </div>
          ))}
          {/* Hourly tick marks (every 4 positions) */}
          {Array.from({ length: 25 }).map((_, i) => {
            const position = i * 4;
            if (HOUR_LABELS.some(h => h.position === position)) return null;
            return (
              <div
                key={`tick-${position}`}
                className="absolute w-px h-2 bg-muted-foreground/40"
                style={{
                  left: `${(position / STEPS) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
            );
          })}
        </div>

        {/* The Slider */}
        <div className="relative mt-3">
          {/* Past time overlay */}
          {pastOverlayWidth > 0 && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-l-full bg-muted-foreground/20 pointer-events-none z-10"
              style={{ width: `${pastOverlayWidth}%` }}
            />
          )}
          
          <SliderPrimitive.Root
            value={[sliderValue]}
            onValueChange={handleValueChange}
            min={0}
            max={STEPS}
            step={1}
            className="relative flex w-full touch-none select-none items-center"
            aria-label="Rally start time"
            aria-valuetext={formatTimeDisplay(value)}
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full timeline-slider-track">
              <SliderPrimitive.Range className="absolute h-full bg-primary/80 rounded-full" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className={cn(
              "block h-6 w-6 rounded-full border-[3px] bg-background shadow-lg ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
              isOpenEnded ? "border-primary animate-pulse" : "border-primary"
            )} />
          </SliderPrimitive.Root>
        </div>

        {/* Hour Labels */}
        <div className="relative mt-2 h-4">
          {HOUR_LABELS.map((hour) => (
            <span
              key={hour.label}
              className={cn(
                "absolute text-[10px] transform -translate-x-1/2",
                hour.position === 96 && isOpenEnded ? "text-primary font-medium" : "text-muted-foreground"
              )}
              style={{ left: `${(hour.position / STEPS) * 100}%` }}
            >
              {hour.label}
            </span>
          ))}
        </div>

        {/* Quick Labels */}
        <div className="relative mt-1 h-4">
          {QUICK_LABELS.map((section) => (
            <span
              key={section.label}
              className={cn(
                "absolute text-[10px] font-medium transform -translate-x-1/2",
                sliderValue >= section.start && sliderValue <= section.end && !isOpenEnded
                  ? "text-primary"
                  : "text-muted-foreground/60"
              )}
              style={{ left: `${(section.center / STEPS) * 100}%` }}
            >
              {section.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
