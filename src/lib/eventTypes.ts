// Centralized Event Types - Single Source of Truth
// Used across Create Event, Quick R@lly, Event Display, and Filtering

export const EVENT_TYPES = [
  // Social
  { value: 'rally', label: 'R@lly', icon: 'Zap', emoji: null, vibe: 'orange' },
  { value: 'pre_game', label: 'Pre-Game', icon: 'Flag', emoji: null, vibe: 'orange' },
  { value: 'party', label: 'Party', icon: 'PartyPopper', emoji: '🎉', vibe: 'purple' },
  { value: 'bar', label: 'Bar / Club', icon: 'Wine', emoji: '🍸', vibe: 'orange' },
  { value: 'happy_hour', label: 'Happy Hour', icon: 'Beer', emoji: '🍺', vibe: 'orange' },
  { value: 'dinner', label: 'Dinner', icon: 'Utensils', emoji: '🍽️', vibe: 'default' },
  { value: 'brunch', label: 'Brunch', icon: 'Coffee', emoji: '🥂', vibe: 'green' },

  // Entertainment
  { value: 'concert', label: 'Concert', icon: 'Music', emoji: '🎵', vibe: 'purple' },
  { value: 'festival', label: 'Festival', icon: 'Sparkles', emoji: '✨', vibe: 'purple' },
  { value: 'movie', label: 'Movie Night', icon: 'Film', emoji: '🎬', vibe: 'blue' },
  { value: 'game_night', label: 'Game Night', icon: 'Gamepad2', emoji: '🎮', vibe: 'blue' },

  // Sports & Outdoors
  { value: 'sports', label: 'Sports', icon: 'Trophy', emoji: '🏆', vibe: 'blue' },
  { value: 'tailgate', label: 'Tailgate', icon: 'Car', emoji: '🏈', vibe: 'blue' },
  { value: 'beach', label: 'Beach Day', icon: 'Umbrella', emoji: '🏖️', vibe: 'green' },
  { value: 'bbq', label: 'BBQ / Cookout', icon: 'Flame', emoji: '🔥', vibe: 'orange' },
  { value: 'hiking', label: 'Hiking / Outdoors', icon: 'Mountain', emoji: '🥾', vibe: 'green' },
  { value: 'fitness', label: 'Workout / Fitness', icon: 'Dumbbell', emoji: '💪', vibe: 'green' },

  // Celebrations
  { value: 'birthday', label: 'Birthday', icon: 'Cake', emoji: '🎂', vibe: 'red' },
  { value: 'wedding', label: 'Wedding', icon: 'Heart', emoji: '💒', vibe: 'red' },
  { value: 'holiday', label: 'Holiday Party', icon: 'Gift', emoji: '🎁', vibe: 'red' },
  { value: 'graduation', label: 'Graduation', icon: 'GraduationCap', emoji: '🎓', vibe: 'blue' },
  { value: 'anniversary', label: 'Anniversary', icon: 'HeartHandshake', emoji: '💕', vibe: 'red' },

  // Travel & Professional
  { value: 'road_trip', label: 'Road Trip', icon: 'Route', emoji: '🚗', vibe: 'blue' },
  { value: 'corporate', label: 'Corporate / Work', icon: 'Briefcase', emoji: null, vibe: 'default' },
  { value: 'networking', label: 'Networking', icon: 'Users', emoji: null, vibe: 'default' },
  { value: 'fundraiser', label: 'Fundraiser', icon: 'HandHeart', emoji: '❤️', vibe: 'red' },

  // General
  { value: 'meetup', label: 'Meetup', icon: 'UsersRound', emoji: null, vibe: 'default' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal', emoji: null, vibe: 'default' },
] as const;

export type EventType = typeof EVENT_TYPES[number]['value'];

/**
 * Get human-readable label for an event type value
 */
export function getEventTypeLabel(value: string): string {
  const found = EVENT_TYPES.find(t => t.value === value);
  if (found) return found.label;
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get icon name for an event type value
 */
export function getEventTypeIcon(value: string): string {
  return EVENT_TYPES.find(t => t.value === value)?.icon || 'Calendar';
}

/**
 * Get emoji for an event type value
 */
export function getEventTypeEmoji(value: string): string | null {
  return EVENT_TYPES.find(t => t.value === value)?.emoji ?? null;
}

/**
 * Get vibe color key for an event type value
 */
export function getEventTypeVibe(value: string): string {
  return EVENT_TYPES.find(t => t.value === value)?.vibe ?? 'default';
}

/**
 * Check if a value is a valid event type
 */
export function isValidEventType(value: string): value is EventType {
  return EVENT_TYPES.some(t => t.value === value);
}
