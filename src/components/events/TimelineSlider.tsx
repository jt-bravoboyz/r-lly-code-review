import { useRef, useEffect, useMemo } from 'react';
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

// Constants for time range: 6 PM (18:00) to 2 AM (26:00 in 24h+ format)
const START_HOUR = 18; // 6 PM
const END_HOUR = 26; // 2 AM next day (treated as 26:00)
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 480 minutes
const STEPS = TOTAL_MINUTES / 15; // 32 steps (0-32 = 33 positions)

interface TimelineSliderProps {
  value: string; // "HH:mm" format (e.g., "21:30")
  onChange: (value: string) => void;
  selectedDate?: Date; // For blocking past times
  className?: string;
}

// Convert slider value (0-32) to time string ("HH:mm")
function sliderToTime(value: number): string {
  const totalMinutes = START_HOUR * 60 + value * 15;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Convert time string ("HH:mm") to slider value (0-32)
function timeToSlider(time: string): number {
  if (!time) return 8; // Default to 8 PM (position 8)
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 8;
  
  // Handle next-day times (0-2 AM) by adding 24
  const adjustedHours = hours < START_HOUR ? hours + 24 : hours;
  const totalMinutes = adjustedHours * 60 + minutes;
  const sliderValue = (totalMinutes - START_HOUR * 60) / 15;
  return Math.max(0, Math.min(STEPS, sliderValue));
}

// Format time for display (e.g., "9:30 PM")
function formatTimeDisplay(time: string): string {
  if (!time) return '8:00 PM';
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
  
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const startMinutes = START_HOUR * 60;
  
  // Before 6 PM - no restriction within slider range
  if (currentTotalMinutes < startMinutes) return 0;
  
  // After 2 AM (but before 6 PM next cycle) - handle edge case
  // This means it's early morning, and the slider shouldn't block anything
  // because we're selecting for *tonight*
  if (currentHours < 6) return 0;
  
  // Between 6 PM and 2 AM - calculate minimum position
  // Add 30 minutes buffer and round up to next 15-min increment
  const bufferMinutes = 15; // Minimum buffer from now
  const minTotalMinutes = currentTotalMinutes + bufferMinutes;
  const minPosition = Math.ceil((minTotalMinutes - startMinutes) / 15);
  
  return Math.max(0, Math.min(STEPS, minPosition));
}

// Hour labels for the timeline
const HOUR_LABELS = [
  { position: 0, label: '6PM' },
  { position: 4, label: '7PM' },
  { position: 8, label: '8PM' },
  { position: 12, label: '9PM' },
  { position: 16, label: '10PM' },
  { position: 20, label: '11PM' },
  { position: 24, label: '12AM' },
  { position: 28, label: '1AM' },
  { position: 32, label: '2AM' },
];

// Quick labels with positions
const QUICK_LABELS = [
  { start: 0, end: 8, label: 'Early', center: 4 },
  { start: 8, end: 20, label: 'Prime', center: 14 },
  { start: 20, end: 32, label: 'Late', center: 26 },
];

export function TimelineSlider({ value, onChange, selectedDate, className }: TimelineSliderProps) {
  const { triggerHaptic } = useHaptics();
  const lastHourRef = useRef<number>(-1);
  const sliderValue = timeToSlider(value);
  const minValue = useMemo(() => getMinSliderValue(selectedDate), [selectedDate]);
  
  // Auto-adjust if current value is below minimum
  useEffect(() => {
    if (sliderValue < minValue) {
      onChange(sliderToTime(minValue));
    }
  }, [minValue, sliderValue, onChange]);

  const handleValueChange = (values: number[]) => {
    const newValue = values[0];
    // Enforce minimum
    const clampedValue = Math.max(newValue, minValue);
    const time = sliderToTime(clampedValue);
    const [hours] = time.split(':').map(Number);
    
    // Trigger haptic when crossing an hour boundary
    if (hours !== lastHourRef.current && clampedValue % 4 === 0) {
      triggerHaptic('selection');
      lastHourRef.current = hours;
    }
    
    onChange(time);
  };

  // Calculate past overlay width
  const pastOverlayWidth = minValue > 0 ? (minValue / STEPS) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Time Display */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">Rally Start Time</span>
        <div className="text-3xl font-bold text-foreground font-montserrat">
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
                hour.position % 4 === 0 ? "h-3" : "h-1.5"
              )} />
            </div>
          ))}
          {/* 15-min tick marks */}
          {Array.from({ length: STEPS + 1 }).map((_, i) => (
            i % 4 !== 0 && (
              <div
                key={`tick-${i}`}
                className="absolute w-px h-1.5 bg-muted-foreground/30"
                style={{
                  left: `${(i / STEPS) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
            )
          ))}
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
            <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-[3px] border-primary bg-background shadow-lg ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing" />
          </SliderPrimitive.Root>
        </div>

        {/* Hour Labels */}
        <div className="relative mt-2 h-4">
          {HOUR_LABELS.filter((_, i) => i % 2 === 0 || i === HOUR_LABELS.length - 1).map((hour) => (
            <span
              key={hour.label}
              className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2"
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
                sliderValue >= section.start && sliderValue <= section.end
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
