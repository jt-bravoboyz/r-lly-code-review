export type StatKey = 'rallies_attended' | 'dd_trips' | 'safe_homes' | 'rides_given' | 'squads_created' | 'messages_sent';

export type UserStats = {
  [K in StatKey]: number;
};

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: 'rally' | 'safety' | 'social' | 'special';
  statKey: 'rallies_attended' | 'dd_trips' | 'safe_homes' | 'rides_given' | 'squads_created' | 'messages_sent';
}

export const BADGES: BadgeDefinition[] = [
  // Rally badges
  {
    id: 'first_rally',
    name: 'First Rally',
    description: 'Attend your first rally event',
    icon: '🎉',
    requirement: 1,
    category: 'rally',
    statKey: 'rallies_attended'
  },
  {
    id: 'rally_regular',
    name: 'Rally Regular',
    description: 'Attend 5 rally events',
    icon: '🔥',
    requirement: 5,
    category: 'rally',
    statKey: 'rallies_attended'
  },
  {
    id: 'rally_veteran',
    name: 'Rally Veteran',
    description: 'Attend 25 rally events',
    icon: '⭐',
    requirement: 25,
    category: 'rally',
    statKey: 'rallies_attended'
  },
  {
    id: 'rally_legend',
    name: 'Rally Legend',
    description: 'Attend 100 rally events',
    icon: '👑',
    requirement: 100,
    category: 'rally',
    statKey: 'rallies_attended'
  },

  // Safety badges
  {
    id: 'designated_hero',
    name: 'Designated Hero',
    description: 'Complete your first DD trip',
    icon: '🦸',
    requirement: 1,
    category: 'safety',
    statKey: 'dd_trips'
  },
  {
    id: 'dd_champion',
    name: 'DD Champion',
    description: 'Complete 5 DD trips',
    icon: '🏆',
    requirement: 5,
    category: 'safety',
    statKey: 'dd_trips'
  },
  {
    id: 'safety_star',
    name: 'Safety Star',
    description: 'Complete 25 DD trips',
    icon: '🌟',
    requirement: 25,
    category: 'safety',
    statKey: 'dd_trips'
  },
  {
    id: 'home_safe',
    name: 'Home Safe',
    description: 'Mark yourself safe at home',
    icon: '🏠',
    requirement: 1,
    category: 'safety',
    statKey: 'safe_homes'
  },
  {
    id: 'always_home',
    name: 'Always Home Safe',
    description: 'Mark safe at home 10 times',
    icon: '🏡',
    requirement: 10,
    category: 'safety',
    statKey: 'safe_homes'
  },

  // Social badges
  {
    id: 'ride_giver',
    name: 'Ride Giver',
    description: 'Give your first ride',
    icon: '🚗',
    requirement: 1,
    category: 'social',
    statKey: 'rides_given'
  },
  {
    id: 'ride_master',
    name: 'Ride Master',
    description: 'Give 10 rides',
    icon: '🚕',
    requirement: 10,
    category: 'social',
    statKey: 'rides_given'
  },
  {
    id: 'squad_leader',
    name: 'Squad Leader',
    description: 'Create your first squad',
    icon: '👥',
    requirement: 1,
    category: 'social',
    statKey: 'squads_created'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Send 50 messages',
    icon: '🦋',
    requirement: 50,
    category: 'social',
    statKey: 'messages_sent'
  },
  {
    id: 'life_of_party',
    name: 'Life of the Party',
    description: 'Send 500 messages',
    icon: '🎊',
    requirement: 500,
    category: 'social',
    statKey: 'messages_sent'
  },
];

export const getBadgesByCategory = (category: BadgeDefinition['category']) => {
  return BADGES.filter(badge => badge.category === category);
};

export const checkBadgeEarned = (badge: BadgeDefinition, stats: UserStats): boolean => {
  return (stats[badge.statKey] || 0) >= badge.requirement;
};

export const getBadgeProgress = (badge: BadgeDefinition, stats: UserStats): number => {
  const current = stats[badge.statKey] || 0;
  return Math.min(100, (current / badge.requirement) * 100);
};
