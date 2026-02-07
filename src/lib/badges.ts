// Badge tier system - users progress through tiers based on reward points
export interface BadgeTier {
  id: string;
  name: string;
  pointsRequired: number;
  gradient: string;
  accentColor: string;
}

export const BADGE_TIERS: BadgeTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    pointsRequired: 0,
    gradient: 'linear-gradient(135deg, #B95B39 0%, #99412F 40%, #FFA14F 100%)',
    accentColor: '#B95B39',
  },
  {
    id: 'silver',
    name: 'Silver',
    pointsRequired: 100,
    gradient: 'linear-gradient(135deg, #8890A6 0%, #D7EDF0 40%, #6E7796 70%, #C4E2FF 100%)',
    accentColor: '#8890A6',
  },
  {
    id: 'gold',
    name: 'Gold',
    pointsRequired: 300,
    gradient: 'linear-gradient(135deg, #FFC64F 0%, #E06919 40%, #FFC640 70%, #FFA02B 100%)',
    accentColor: '#FFC64F',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    pointsRequired: 600,
    gradient: 'linear-gradient(135deg, #39F1B3 0%, #03823C 50%, #E0FE60 100%)',
    accentColor: '#39F1B3',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    pointsRequired: 1000,
    gradient: 'linear-gradient(135deg, #FF5522 0%, #A84E33 50%, #FFAB92 100%)',
    accentColor: '#FF5522',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    pointsRequired: 1500,
    gradient: 'linear-gradient(135deg, #F73F36 0%, #F00300 40%, #FFECA1 100%)',
    accentColor: '#F73F36',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    pointsRequired: 2500,
    gradient: 'linear-gradient(135deg, #6941BF 0%, #A35CCA 50%, #E5CFFF 100%)',
    accentColor: '#A35CCA',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    pointsRequired: 4000,
    gradient: 'linear-gradient(135deg, #57ADDD 0%, #70BBEF 50%, #9CD7F2 100%)',
    accentColor: '#70BBEF',
  },
  {
    id: 'pink_diamond',
    name: 'Pink Diamond',
    pointsRequired: 6000,
    gradient: 'linear-gradient(135deg, #EA4E7F 0%, #DD2F61 50%, #FF94B3 100%)',
    accentColor: '#EA4E7F',
  },
  {
    id: 'galaxy_opal',
    name: 'Galaxy Opal',
    pointsRequired: 9000,
    gradient: 'linear-gradient(135deg, #836CD9 0%, #86D8FC 50%, #B5B0F7 100%)',
    accentColor: '#836CD9',
  },
  {
    id: 'dark_matter',
    name: 'Dark Matter',
    pointsRequired: 15000,
    gradient: 'linear-gradient(135deg, #19305C 0%, #2B3894 30%, #865CB2 60%, #FF50B5 100%)',
    accentColor: '#FF50B5',
  },
];

export const getCurrentTier = (points: number): BadgeTier => {
  let currentTier = BADGE_TIERS[0];
  for (const tier of BADGE_TIERS) {
    if (points >= tier.pointsRequired) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
};

export const getNextTier = (points: number): BadgeTier | null => {
  for (const tier of BADGE_TIERS) {
    if (points < tier.pointsRequired) {
      return tier;
    }
  }
  return null; // Max tier reached
};

export const getProgressToNextTier = (points: number): { current: number; next: number; progress: number } => {
  const currentTier = getCurrentTier(points);
  const nextTier = getNextTier(points);
  
  if (!nextTier) {
    return { current: points, next: points, progress: 100 };
  }
  
  const pointsInCurrentTier = points - currentTier.pointsRequired;
  const pointsNeededForNext = nextTier.pointsRequired - currentTier.pointsRequired;
  const progress = (pointsInCurrentTier / pointsNeededForNext) * 100;
  
  return {
    current: points,
    next: nextTier.pointsRequired,
    progress: Math.min(100, progress),
  };
};

export const getMotivationalMessage = (tierName: string): string => {
  const messages: Record<string, string> = {
    bronze: "Look at you, just getting started! Keep R@llying with your squad and you'll level up in no time. The journey to the top starts here!",
    silver: "You're making moves! We're definitely seeing your potential but there's more work to be done if you want to be a champion.",
    gold: "Now we're talking! You're shining bright and showing everyone what R@lly life is all about. Keep that momentum going!",
    emerald: "Wow, you're really standing out! Your dedication to safe nights out is inspiring. You're becoming a legend!",
    sapphire: "Absolutely crushing it! You've proven you're committed to the squad. The elite badges are within reach!",
    ruby: "Fire! You're blazing through the ranks like a true R@lly veteran. Not many make it this far!",
    amethyst: "Royal status achieved! You're in rare company now. Keep going and you'll reach the pinnacle!",
    diamond: "Brilliant! You're sparkling at the top tiers. Only the most dedicated R@lliers make it here!",
    pink_diamond: "Extraordinary! You're one of the elite few. Your commitment is truly remarkable!",
    galaxy_opal: "Cosmic level unlocked! You're among the stars now. The ultimate badge awaits!",
    dark_matter: "LEGENDARY! You've reached the highest tier. You are the embodiment of R@lly excellence!",
  };
  return messages[tierName] || messages.bronze;
};

export const getTierQuote = (tierKey: string): string => {
  const quotes: Record<string, string> = {
    bronze: '"B stands for bitch cup. Hold up, drink this."',
    silver: '"Private, you\'ve moved up in rank! You\'re officially moving out of the dorm basement and into sophomore year of the R@lly army. Thank you for your service."',
    gold: '"Look at you, a professional pussy footer! We\'re definitely seeing your potential but there is more work to be done if you want to be a champion."',
    emerald: '"If ya look good, ya feel good. If ya feel good, you play good. And if you play good, they pay good."\n— Deion Sanders',
    sapphire: '"Wow… you\'ve done a lot of drinking. We\'re not sure if that\'s an achievement or a cry for help, but either way—we\'re celebrating you tonight."',
    ruby: '"Damn you might actually be a penis stomper! Keep showing out in practice and maybe you\'ll see the field."',
    amethyst: '"You honestly could have gone D1 for drinking. Too bad it\'s just another reason for your parents to disapprove of your life choices."',
    diamond: '"In the words of Lyndon B. Johnson, \'You fuck.\'"',
    pink_diamond: '"You don\'t follow the crowd—you lead it, shot for shot. And hopefully, one day, that same leadership shows up in a part of your life that doesn\'t make you a total degenerate."',
    galaxy_opal: '"You\'re a certified party general now. The troops salute you and your dedication to your craft."',
    dark_matter: '"You don\'t pre-game, you pre-career. You\'re the AA leader. Uber drivers put YOU on their vision boards. Your liver has its own gym membership. You\'ve gone beyond the frat house, beyond the campus, beyond the galaxy. Dark Matter unlocked. Job well done."',
  };
  return quotes[tierKey] || '';
};
