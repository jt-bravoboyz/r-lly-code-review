import { cn } from '@/lib/utils';
import { Award, Lock } from 'lucide-react';
import type { BadgeTier } from '@/hooks/useBadgeSystem';

// Tier color configs for glow & styling
const TIER_STYLES: Record<string, { glow: string; ring: string; core: string }> = {
  bronze:       { glow: '#B95B39', ring: '#FFA14F', core: '#99412F' },
  silver:       { glow: '#8890A6', ring: '#D7EDF0', core: '#6E7796' },
  gold:         { glow: '#FFC64F', ring: '#FFA02B', core: '#E06919' },
  emerald:      { glow: '#39F1B3', ring: '#E0FE60', core: '#03823C' },
  sapphire:     { glow: '#FF5522', ring: '#FFAB92', core: '#A84E33' },
  ruby:         { glow: '#F73F36', ring: '#FFECA1', core: '#F00300' },
  amethyst:     { glow: '#A35CCA', ring: '#E5CFFF', core: '#6941BF' },
  diamond:      { glow: '#70BBEF', ring: '#9CD7F2', core: '#57ADDD' },
  pink_diamond: { glow: '#EA4E7F', ring: '#FF94B3', core: '#DD2F61' },
  galaxy_opal:  { glow: '#836CD9', ring: '#86D8FC', core: '#B5B0F7' },
  dark_matter:  { glow: '#FF50B5', ring: '#865CB2', core: '#2B3894' },
};

// Each tier gets a unique emblem SVG — shields/crests with inner symbols
const TIER_EMBLEMS: Record<string, (colors: { glow: string; ring: string; core: string }) => string> = {
  bronze: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-bronze" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#FFD8A8"/>
        <stop offset="25%" stop-color="#E08A4E"/>
        <stop offset="55%" stop-color="#A85024"/>
        <stop offset="80%" stop-color="#6B2E14"/>
        <stop offset="100%" stop-color="#3A1808"/>
      </radialGradient>
      <linearGradient id="ribbon-bronze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7A2E1A"/>
        <stop offset="50%" stop-color="#C44A26"/>
        <stop offset="100%" stop-color="#7A2E1A"/>
      </linearGradient>
      <linearGradient id="rim-bronze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFE0B0"/>
        <stop offset="40%" stop-color="#B26032"/>
        <stop offset="60%" stop-color="#7A3818"/>
        <stop offset="100%" stop-color="#FFD08A"/>
      </linearGradient>
    </defs>
    <path d="M22 2L26 12H38L42 2L36 6H28L22 2Z" fill="url(#ribbon-bronze)"/>
    <path d="M27 4V12M37 4V12M32 5V12" stroke="#3A1808" stroke-width="0.4" opacity="0.5"/>
    <circle cx="32" cy="36" r="24" fill="url(#rim-bronze)"/>
    <g opacity="0.55" fill="#3A1808">
      <path d="M32 12L33 18H31L32 12Z"/>
      <path d="M44 15L42 20L41 19L44 15Z"/>
      <path d="M52 22L48 25L47 24L52 22Z"/>
      <path d="M55 33L50 33V32L55 33Z"/>
      <path d="M52 45L48 42L48 41L52 45Z"/>
      <path d="M44 53L42 49L43 48L44 53Z"/>
      <path d="M32 56L31 50H33L32 56Z"/>
      <path d="M20 53L22 49L21 48L20 53Z"/>
      <path d="M12 45L16 42L16 41L12 45Z"/>
      <path d="M9 33L14 33V32L9 33Z"/>
      <path d="M12 22L16 25L17 24L12 22Z"/>
      <path d="M20 15L22 20L23 19L20 15Z"/>
    </g>
    <circle cx="32" cy="36" r="19" fill="url(#bg-bronze)"/>
    <circle cx="32" cy="36" r="19" stroke="#3A1808" stroke-width="0.6" opacity="0.6"/>
    <circle cx="32" cy="36" r="16" fill="none" stroke="#FFD8A8" stroke-width="0.4" opacity="0.45"/>
    <ellipse cx="25" cy="29" rx="9" ry="5" fill="#FFE8C4" opacity="0.35"/>
    <path d="M18 36C18 30 20 25 24 22" stroke="#3A1808" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M46 36C46 30 44 25 40 22" stroke="#3A1808" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M18 36C18 42 20 47 24 50" stroke="#3A1808" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M46 36C46 42 44 47 40 50" stroke="#3A1808" stroke-width="0.6" opacity="0.55" fill="none"/>
    <g fill="#3A1808" opacity="0.55">
      <ellipse cx="19" cy="32" rx="1.2" ry="2" transform="rotate(-30 19 32)"/>
      <ellipse cx="20" cy="40" rx="1.2" ry="2" transform="rotate(30 20 40)"/>
      <ellipse cx="22" cy="46" rx="1.2" ry="2" transform="rotate(50 22 46)"/>
      <ellipse cx="45" cy="32" rx="1.2" ry="2" transform="rotate(30 45 32)"/>
      <ellipse cx="44" cy="40" rx="1.2" ry="2" transform="rotate(-30 44 40)"/>
      <ellipse cx="42" cy="46" rx="1.2" ry="2" transform="rotate(-50 42 46)"/>
    </g>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" fill="#FFE8C4" opacity="0.95"/>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" stroke="#3A1808" stroke-width="0.3" opacity="0.6" fill="none"/>
  </svg>`,

  silver: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-silver" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="25%" stop-color="#E8EEF5"/>
        <stop offset="55%" stop-color="#9AA4B8"/>
        <stop offset="80%" stop-color="#5A6478"/>
        <stop offset="100%" stop-color="#2C3340"/>
      </radialGradient>
      <linearGradient id="ribbon-silver" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3A4255"/>
        <stop offset="50%" stop-color="#7A8499"/>
        <stop offset="100%" stop-color="#3A4255"/>
      </linearGradient>
      <linearGradient id="rim-silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="40%" stop-color="#A8B2C4"/>
        <stop offset="60%" stop-color="#5A6478"/>
        <stop offset="100%" stop-color="#F0F4FA"/>
      </linearGradient>
    </defs>
    <path d="M22 2L26 12H38L42 2L36 6H28L22 2Z" fill="url(#ribbon-silver)"/>
    <path d="M27 4V12M37 4V12M32 5V12" stroke="#1A1F2A" stroke-width="0.4" opacity="0.5"/>
    <circle cx="32" cy="36" r="24" fill="url(#rim-silver)"/>
    <g opacity="0.5" fill="#1A1F2A">
      <path d="M32 12L33 18H31L32 12Z"/>
      <path d="M44 15L42 20L41 19L44 15Z"/>
      <path d="M52 22L48 25L47 24L52 22Z"/>
      <path d="M55 33L50 33V32L55 33Z"/>
      <path d="M52 45L48 42L48 41L52 45Z"/>
      <path d="M44 53L42 49L43 48L44 53Z"/>
      <path d="M32 56L31 50H33L32 56Z"/>
      <path d="M20 53L22 49L21 48L20 53Z"/>
      <path d="M12 45L16 42L16 41L12 45Z"/>
      <path d="M9 33L14 33V32L9 33Z"/>
      <path d="M12 22L16 25L17 24L12 22Z"/>
      <path d="M20 15L22 20L23 19L20 15Z"/>
    </g>
    <circle cx="32" cy="36" r="19" fill="url(#bg-silver)"/>
    <circle cx="32" cy="36" r="19" stroke="#1A1F2A" stroke-width="0.6" opacity="0.55"/>
    <circle cx="32" cy="36" r="16" fill="none" stroke="#FFFFFF" stroke-width="0.4" opacity="0.5"/>
    <ellipse cx="25" cy="29" rx="9" ry="5" fill="#FFFFFF" opacity="0.45"/>
    <path d="M18 36C18 30 20 25 24 22" stroke="#1A1F2A" stroke-width="0.6" opacity="0.5" fill="none"/>
    <path d="M46 36C46 30 44 25 40 22" stroke="#1A1F2A" stroke-width="0.6" opacity="0.5" fill="none"/>
    <path d="M18 36C18 42 20 47 24 50" stroke="#1A1F2A" stroke-width="0.6" opacity="0.5" fill="none"/>
    <path d="M46 36C46 42 44 47 40 50" stroke="#1A1F2A" stroke-width="0.6" opacity="0.5" fill="none"/>
    <g fill="#1A1F2A" opacity="0.5">
      <ellipse cx="19" cy="32" rx="1.2" ry="2" transform="rotate(-30 19 32)"/>
      <ellipse cx="20" cy="40" rx="1.2" ry="2" transform="rotate(30 20 40)"/>
      <ellipse cx="22" cy="46" rx="1.2" ry="2" transform="rotate(50 22 46)"/>
      <ellipse cx="45" cy="32" rx="1.2" ry="2" transform="rotate(30 45 32)"/>
      <ellipse cx="44" cy="40" rx="1.2" ry="2" transform="rotate(-30 44 40)"/>
      <ellipse cx="42" cy="46" rx="1.2" ry="2" transform="rotate(-50 42 46)"/>
    </g>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" fill="#FFFFFF" opacity="0.95"/>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" stroke="#1A1F2A" stroke-width="0.3" opacity="0.55" fill="none"/>
  </svg>`,

  gold: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-gold" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#FFF6C4"/>
        <stop offset="25%" stop-color="#FFD24A"/>
        <stop offset="55%" stop-color="#D9871A"/>
        <stop offset="80%" stop-color="#8A4E08"/>
        <stop offset="100%" stop-color="#3F2304"/>
      </radialGradient>
      <linearGradient id="ribbon-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7A1A1A"/>
        <stop offset="50%" stop-color="#C42626"/>
        <stop offset="100%" stop-color="#7A1A1A"/>
      </linearGradient>
      <linearGradient id="rim-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF4B8"/>
        <stop offset="40%" stop-color="#E0A828"/>
        <stop offset="60%" stop-color="#8A5A10"/>
        <stop offset="100%" stop-color="#FFE890"/>
      </linearGradient>
    </defs>
    <path d="M22 2L26 12H38L42 2L36 6H28L22 2Z" fill="url(#ribbon-gold)"/>
    <path d="M27 4V12M37 4V12M32 5V12" stroke="#3F0808" stroke-width="0.4" opacity="0.5"/>
    <circle cx="32" cy="36" r="24" fill="url(#rim-gold)"/>
    <g opacity="0.55" fill="#3F2304">
      <path d="M32 12L33 18H31L32 12Z"/>
      <path d="M44 15L42 20L41 19L44 15Z"/>
      <path d="M52 22L48 25L47 24L52 22Z"/>
      <path d="M55 33L50 33V32L55 33Z"/>
      <path d="M52 45L48 42L48 41L52 45Z"/>
      <path d="M44 53L42 49L43 48L44 53Z"/>
      <path d="M32 56L31 50H33L32 56Z"/>
      <path d="M20 53L22 49L21 48L20 53Z"/>
      <path d="M12 45L16 42L16 41L12 45Z"/>
      <path d="M9 33L14 33V32L9 33Z"/>
      <path d="M12 22L16 25L17 24L12 22Z"/>
      <path d="M20 15L22 20L23 19L20 15Z"/>
    </g>
    <circle cx="32" cy="36" r="19" fill="url(#bg-gold)"/>
    <circle cx="32" cy="36" r="19" stroke="#3F2304" stroke-width="0.6" opacity="0.6"/>
    <circle cx="32" cy="36" r="16" fill="none" stroke="#FFF6C4" stroke-width="0.4" opacity="0.5"/>
    <ellipse cx="25" cy="29" rx="9" ry="5" fill="#FFF6C4" opacity="0.5"/>
    <path d="M18 36C18 30 20 25 24 22" stroke="#3F2304" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M46 36C46 30 44 25 40 22" stroke="#3F2304" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M18 36C18 42 20 47 24 50" stroke="#3F2304" stroke-width="0.6" opacity="0.55" fill="none"/>
    <path d="M46 36C46 42 44 47 40 50" stroke="#3F2304" stroke-width="0.6" opacity="0.55" fill="none"/>
    <g fill="#3F2304" opacity="0.55">
      <ellipse cx="19" cy="32" rx="1.2" ry="2" transform="rotate(-30 19 32)"/>
      <ellipse cx="20" cy="40" rx="1.2" ry="2" transform="rotate(30 20 40)"/>
      <ellipse cx="22" cy="46" rx="1.2" ry="2" transform="rotate(50 22 46)"/>
      <ellipse cx="45" cy="32" rx="1.2" ry="2" transform="rotate(30 45 32)"/>
      <ellipse cx="44" cy="40" rx="1.2" ry="2" transform="rotate(-30 44 40)"/>
      <ellipse cx="42" cy="46" rx="1.2" ry="2" transform="rotate(-50 42 46)"/>
    </g>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" fill="#FFF6C4" opacity="0.98"/>
    <path d="M32 27L34 33H40L35 36.5L37 42L32 38.5L27 42L29 36.5L24 33H30L32 27Z" stroke="#3F2304" stroke-width="0.3" opacity="0.6" fill="none"/>
  </svg>`,

  emerald: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-emerald" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#39F1B3"/>
        <stop offset="50%" stop-color="#03823C"/>
        <stop offset="100%" stop-color="#E0FE60"/>
      </linearGradient>
    </defs>
    <path d="M32 3L16 12L8 32L16 52L32 61L48 52L56 32L48 12L32 3Z" fill="url(#bg-emerald)"/>
    <path d="M32 10L20 17L13 32L20 47L32 54L44 47L51 32L44 17L32 10Z" stroke="white" stroke-width="0.8" opacity="0.3"/>
    <path d="M32 18L24 24L20 32L24 40L32 46L40 40L44 32L40 24L32 18Z" fill="white" opacity="0.15"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.85"/>
  </svg>`,

  sapphire: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-sapphire" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#FF5522"/>
        <stop offset="50%" stop-color="#A84E33"/>
        <stop offset="100%" stop-color="#FFAB92"/>
      </linearGradient>
    </defs>
    <path d="M32 3L14 14L6 32L14 50L32 61L50 50L58 32L50 14L32 3Z" fill="url(#bg-sapphire)"/>
    <path d="M32 9L18 17L11 32L18 47L32 55L46 47L53 32L46 17L32 9Z" stroke="white" stroke-width="0.6" opacity="0.3"/>
    <path d="M32 18L24 24L20 32L24 40L32 46L40 40L44 32L40 24L32 18Z" fill="white" opacity="0.15"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.8"/>
    <circle cx="32" cy="32" r="4" fill="white" opacity="0.9"/>
  </svg>`,

  ruby: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-ruby" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#F73F36"/>
        <stop offset="35%" stop-color="#F00300"/>
        <stop offset="70%" stop-color="#B80000"/>
        <stop offset="100%" stop-color="#FFECA1"/>
      </linearGradient>
      <radialGradient id="ruby-pulse" cx="50%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#FF6644" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#F00300" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="M32 3L14 14L6 32L14 50L32 61L50 50L58 32L50 14L32 3Z" fill="url(#bg-ruby)"/>
    <path d="M32 9L18 17L11 32L18 47L32 55L46 47L53 32L46 17L32 9Z" stroke="#FFECA1" stroke-width="0.6" opacity="0.25"/>
    <path d="M32 16L22 22L17 32L22 42L32 48L42 42L47 32L42 22L32 16Z" fill="url(#ruby-pulse)"/>
    <path d="M32 20L25 25L22 32L25 39L32 44L39 39L42 32L39 25L32 20Z" stroke="white" stroke-width="0.4" opacity="0.2"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.12"/>
    <path d="M32 28L30 30L29 32L30 34L32 36L34 34L35 32L34 30L32 28Z" fill="white" opacity="0.9"/>
    <path d="M26 14L32 9L38 14" stroke="#FFECA1" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
    <path d="M20 18L32 12L44 18" stroke="white" stroke-width="0.5" opacity="0.15"/>
  </svg>`,

  amethyst: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-amethyst" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#6941BF"/>
        <stop offset="40%" stop-color="#A35CCA"/>
        <stop offset="80%" stop-color="#7B3FA0"/>
        <stop offset="100%" stop-color="#E5CFFF"/>
      </linearGradient>
      <linearGradient id="amethyst-swirl" x1="20" y1="20" x2="44" y2="44" gradientTransform="rotate(45 32 32)">
        <stop offset="0%" stop-color="#E5CFFF" stop-opacity="0.3"/>
        <stop offset="50%" stop-color="#6941BF" stop-opacity="0"/>
        <stop offset="100%" stop-color="#E5CFFF" stop-opacity="0.2"/>
      </linearGradient>
    </defs>
    <path d="M32 2L20 8L14 18L10 32L14 46L20 56L32 62L44 56L50 46L54 32L50 18L44 8L32 2Z" fill="url(#bg-amethyst)"/>
    <path d="M32 7L22 12L17 20L14 32L17 44L22 52L32 57L42 52L47 44L50 32L47 20L42 12L32 7Z" stroke="#E5CFFF" stroke-width="0.5" opacity="0.2"/>
    <path d="M32 14L24 20L20 32L24 44L32 50L40 44L44 32L40 20L32 14Z" fill="url(#amethyst-swirl)"/>
    <path d="M32 20L27 24L24 32L27 40L32 44L37 40L40 32L37 24L32 20Z" stroke="white" stroke-width="0.4" opacity="0.15"/>
    <path d="M32 24L29 27L27 32L29 37L32 40L35 37L37 32L35 27L32 24Z" fill="white" opacity="0.1"/>
    <path d="M32 28L30 30L29 32L30 34L32 36L34 34L35 32L34 30L32 28Z" fill="white" opacity="0.85"/>
    <circle cx="32" cy="32" r="2" fill="#E5CFFF" opacity="0.5"/>
    <path d="M26 10L32 6L38 10" stroke="#E5CFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M20 16L32 9L44 16" stroke="#E5CFFF" stroke-width="0.5" opacity="0.2"/>
  </svg>`,

  diamond: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-diamond" x1="10" y1="4" x2="54" y2="60">
        <stop offset="0%" stop-color="#9CD7F2"/>
        <stop offset="30%" stop-color="#57ADDD"/>
        <stop offset="60%" stop-color="#70BBEF"/>
        <stop offset="100%" stop-color="#E8F6FF"/>
      </linearGradient>
      <linearGradient id="diamond-facet" x1="20" y1="4" x2="44" y2="48">
        <stop offset="0%" stop-color="white" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="M32 4L10 20L32 60L54 20L32 4Z" fill="url(#bg-diamond)"/>
    <path d="M10 20H54" stroke="white" stroke-width="1" opacity="0.6"/>
    <path d="M32 4L16 20L32 50L48 20L32 4Z" fill="url(#diamond-facet)" opacity="0.3"/>
    <path d="M32 4L22 20L32 48L42 20L32 4Z" fill="white" opacity="0.15"/>
    <path d="M32 4V20" stroke="white" stroke-width="0.8" opacity="0.5"/>
    <path d="M22 20L32 48" stroke="white" stroke-width="0.5" opacity="0.3"/>
    <path d="M42 20L32 48" stroke="white" stroke-width="0.5" opacity="0.3"/>
    <path d="M16 20L32 4L48 20" stroke="white" stroke-width="0.5" opacity="0.25"/>
    <circle cx="28" cy="16" r="1.5" fill="white" opacity="0.7"/>
    <circle cx="38" cy="24" r="1" fill="white" opacity="0.5"/>
    <circle cx="32" cy="14" r="0.8" fill="white" opacity="0.6"/>
  </svg>`,

  pink_diamond: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-pinkd" x1="10" y1="4" x2="54" y2="60">
        <stop offset="0%" stop-color="#FF94B3"/>
        <stop offset="40%" stop-color="#EA4E7F"/>
        <stop offset="70%" stop-color="#DD2F61"/>
        <stop offset="100%" stop-color="#FFD4E5"/>
      </linearGradient>
      <radialGradient id="pinkd-radiance" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#FFD4E5" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#DD2F61" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="M32 4L10 20L32 60L54 20L32 4Z" fill="url(#bg-pinkd)"/>
    <path d="M10 20H54" stroke="white" stroke-width="1.2" opacity="0.5"/>
    <path d="M32 4L18 20L32 50L46 20L32 4Z" fill="url(#pinkd-radiance)"/>
    <path d="M32 4L24 20L32 44L40 20L32 4Z" fill="white" opacity="0.15"/>
    <path d="M32 4V20M24 20L32 44M40 20L32 44" stroke="white" stroke-width="0.5" opacity="0.3"/>
    <path d="M26 10L32 6L38 10" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    <circle cx="32" cy="24" r="4" fill="white" opacity="0.2"/>
    <circle cx="32" cy="24" r="2" fill="white" opacity="0.85"/>
    <circle cx="26" cy="18" r="1" fill="white" opacity="0.5"/>
    <circle cx="38" cy="18" r="0.8" fill="white" opacity="0.4"/>
  </svg>`,

  galaxy_opal: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-opal" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#86D8FC"/>
        <stop offset="35%" stop-color="#836CD9"/>
        <stop offset="70%" stop-color="#B5B0F7"/>
        <stop offset="100%" stop-color="#2B1F5C"/>
      </radialGradient>
      <radialGradient id="opal-nebula" cx="40%" cy="45%" r="35%">
        <stop offset="0%" stop-color="#F47A19" stop-opacity="0.25"/>
        <stop offset="50%" stop-color="#836CD9" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#bg-opal)"/>
    <circle cx="32" cy="32" r="28" fill="url(#opal-nebula)"/>
    <ellipse cx="32" cy="32" rx="22" ry="16" stroke="#86D8FC" stroke-width="0.5" opacity="0.2" transform="rotate(-15 32 32)"/>
    <ellipse cx="32" cy="32" rx="15" ry="10" stroke="#B5B0F7" stroke-width="0.4" opacity="0.15" transform="rotate(20 32 32)"/>
    <circle cx="24" cy="26" r="3" fill="#86D8FC" opacity="0.5"/>
    <circle cx="40" cy="30" r="2.5" fill="#B5B0F7" opacity="0.4"/>
    <circle cx="28" cy="38" r="2" fill="#F47A19" opacity="0.3"/>
    <circle cx="36" cy="36" r="1.5" fill="white" opacity="0.5"/>
    <circle cx="32" cy="28" r="1" fill="white" opacity="0.7"/>
    <circle cx="22" cy="34" r="0.8" fill="#86D8FC" opacity="0.6"/>
    <circle cx="42" cy="26" r="0.6" fill="white" opacity="0.4"/>
    <path d="M14 24C20 16 26 13 32 14C38 15 44 20 50 28" stroke="white" stroke-width="0.4" opacity="0.2"/>
    <path d="M18 40C22 46 28 50 34 49C40 48 46 42 50 36" stroke="#B5B0F7" stroke-width="0.3" opacity="0.15"/>
  </svg>`,

  dark_matter: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-dm" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0a0a1a"/>
        <stop offset="40%" stop-color="#19305C"/>
        <stop offset="70%" stop-color="#2B3894"/>
        <stop offset="100%" stop-color="#19305C"/>
      </radialGradient>
      <radialGradient id="dm-void" cx="50%" cy="50%" r="25%">
        <stop offset="0%" stop-color="#000000"/>
        <stop offset="100%" stop-color="#0a0a1a"/>
      </radialGradient>
      <radialGradient id="dm-core" cx="50%" cy="50%" r="20%">
        <stop offset="0%" stop-color="#FF50B5" stop-opacity="0.8"/>
        <stop offset="60%" stop-color="#865CB2" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <linearGradient id="dm-edge" x1="4" y1="4" x2="60" y2="60">
        <stop offset="0%" stop-color="#FF50B5"/>
        <stop offset="50%" stop-color="#865CB2"/>
        <stop offset="100%" stop-color="#FF50B5"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#bg-dm)"/>
    <circle cx="32" cy="32" r="27" stroke="url(#dm-edge)" stroke-width="1" opacity="0.4"/>
    <circle cx="32" cy="32" r="22" stroke="#865CB2" stroke-width="0.5" opacity="0.15"/>
    <circle cx="32" cy="32" r="14" fill="url(#dm-void)"/>
    <circle cx="32" cy="32" r="8" fill="url(#dm-core)"/>
    <circle cx="32" cy="32" r="3" fill="#0a0a1a"/>
    <circle cx="32" cy="32" r="1.5" fill="#FF50B5" opacity="0.7"/>
    <path d="M10 32C10 18 18 10 32 10" stroke="#FF50B5" stroke-width="0.8" opacity="0.35"/>
    <path d="M54 32C54 46 46 54 32 54" stroke="#865CB2" stroke-width="0.8" opacity="0.35"/>
    <path d="M18 14C22 10 27 8 32 8" stroke="#FF50B5" stroke-width="0.4" opacity="0.2"/>
    <path d="M46 50C42 54 37 56 32 56" stroke="#865CB2" stroke-width="0.4" opacity="0.2"/>
  </svg>`,
};

interface TierBadgeIconProps {
  tier: BadgeTier | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locked?: boolean;
  className?: string;
  showGlow?: boolean;
  isCurrent?: boolean;
}

const sizePx = { sm: 36, md: 52, lg: 68, xl: 100 };

// Tier-specific idle animation overrides
const TIER_ANIMATION: Record<string, string> = {
  ruby: 'animate-badge-heartbeat',
  galaxy_opal: 'animate-badge-cosmic',
  dark_matter: 'animate-badge-void',
};
const sizeClasses = { sm: 'w-9 h-9', md: 'w-13 h-13', lg: 'w-[68px] h-[68px]', xl: 'w-[100px] h-[100px]' };

export function TierBadgeIcon({
  tier,
  size = 'md',
  locked = false,
  className,
  showGlow = false,
  isCurrent = false,
}: TierBadgeIconProps) {
  if (!tier) {
    return (
      <div className={cn(sizeClasses[size], 'flex items-center justify-center rounded-full bg-muted', className)}>
        <Award className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    );
  }

  const tierKey = tier.tier_key;
  const style = TIER_STYLES[tierKey] || TIER_STYLES.bronze;
  const getEmblem = TIER_EMBLEMS[tierKey] || TIER_EMBLEMS.bronze;
  const svgHtml = getEmblem(style);
  const px = sizePx[size];

  if (locked) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'relative flex items-center justify-center',
          className
        )}
      >
        {/* Faded emblem */}
        <div
          className="w-full h-full opacity-20 grayscale blur-[0.5px]"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-1/3 h-1/3 text-muted-foreground/60" />
        </div>
      </div>
    );
  }

  const tierAnim = TIER_ANIMATION[tierKey] || 'animate-badge-breathe';

  return (
    <div
      className={cn(
        sizeClasses[size],
        'relative flex items-center justify-center group',
        tierAnim,
        /* Hover/focus lift */
        'transition-transform duration-300 hover:scale-105',
        className
      )}
      style={{
        '--badge-glow': style.glow,
        '--badge-ring': style.ring,
      } as React.CSSProperties}
    >
      {/* Outer glow ring — always visible, intensifies on current */}
      <div
        className={cn(
          'absolute inset-[-4px] rounded-full opacity-0',
          isCurrent ? 'animate-badge-ring-active' : 'animate-badge-ring-idle'
        )}
        style={{
          background: `radial-gradient(circle, ${style.glow}30 0%, transparent 70%)`,
        }}
      />

      {/* Shimmer sweep overlay */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
        style={{ mixBlendMode: 'overlay' }}
      >
        <div className="absolute inset-0 animate-badge-shimmer"
          style={{
            background: `linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Main emblem */}
      <div
        className={cn(
          'w-full h-full relative z-10 transition-all duration-300',
          'group-hover:drop-shadow-lg'
        )}
        style={{
          filter: showGlow || isCurrent
            ? `drop-shadow(0 0 ${isCurrent ? 8 : 5}px ${style.glow}60)`
            : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Current tier active ring */}
      {isCurrent && (
        <div
          className="absolute inset-[-3px] rounded-full animate-badge-active-ring pointer-events-none z-0"
          style={{
            border: `1.5px solid ${style.glow}50`,
          }}
        />
      )}
    </div>
  );
}
