// Centralized Event Types - Single Source of Truth
// Used across Create Event, Quick R@lly, Event Display, and Filtering

export const EVENT_TYPES = [
  // Social
  { value: 'rally', label: 'R@lly', icon: 'Zap' },
  { value: 'party', label: 'Party', icon: 'PartyPopper' },
  { value: 'bar', label: 'Bar / Club', icon: 'Wine' },
  { value: 'happy_hour', label: 'Happy Hour', icon: 'Beer' },
  { value: 'dinner', label: 'Dinner', icon: 'Utensils' },
  { value: 'brunch', label: 'Brunch', icon: 'Coffee' },

  // Entertainment
  { value: 'concert', label: 'Concert', icon: 'Music' },
  { value: 'festival', label: 'Festival', icon: 'Sparkles' },
  { value: 'movie', label: 'Movie Night', icon: 'Film' },
  { value: 'game_night', label: 'Game Night', icon: 'Gamepad2' },

  // Sports & Outdoors
  { value: 'sports', label: 'Sports', icon: 'Trophy' },
  { value: 'tailgate', label: 'Tailgate', icon: 'Car' },
  { value: 'beach', label: 'Beach Day', icon: 'Umbrella' },
  { value: 'bbq', label: 'BBQ / Cookout', icon: 'Flame' },
  { value: 'hiking', label: 'Hiking / Outdoors', icon: 'Mountain' },
  { value: 'fitness', label: 'Workout / Fitness', icon: 'Dumbbell' },

  // Celebrations
  { value: 'birthday', label: 'Birthday', icon: 'Cake' },
  { value: 'wedding', label: 'Wedding', icon: 'Heart' },
  { value: 'holiday', label: 'Holiday Party', icon: 'Gift' },
  { value: 'graduation', label: 'Graduation', icon: 'GraduationCap' },
  { value: 'anniversary', label: 'Anniversary', icon: 'HeartHandshake' },

  // Travel & Professional
  { value: 'road_trip', label: 'Road Trip', icon: 'Route' },
  { value: 'corporate', label: 'Corporate / Work', icon: 'Briefcase' },
  { value: 'networking', label: 'Networking', icon: 'Users' },
  { value: 'fundraiser', label: 'Fundraiser', icon: 'HandHeart' },

  // General
  { value: 'meetup', label: 'Meetup', icon: 'UsersRound' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
] as const;

export type EventType = typeof EVENT_TYPES[number]['value'];

/**
 * Get human-readable label for an event type value
 * @param value - The event type value (e.g., 'happy_hour')
 * @returns The formatted label (e.g., 'Happy Hour')
 */
export function getEventTypeLabel(value: string): string {
  const found = EVENT_TYPES.find(t => t.value === value);
  if (found) return found.label;
  
  // Fallback: capitalize and replace underscores
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get icon name for an event type value
 * @param value - The event type value (e.g., 'concert')
 * @returns The Lucide icon name (e.g., 'Music')
 */
export function getEventTypeIcon(value: string): string {
  return EVENT_TYPES.find(t => t.value === value)?.icon || 'Calendar';
}

/**
 * Check if a value is a valid event type
 * @param value - The value to check
 * @returns True if the value is a valid event type
 */
export function isValidEventType(value: string): value is EventType {
  return EVENT_TYPES.some(t => t.value === value);
}
