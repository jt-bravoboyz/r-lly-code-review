import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'rally_theme';

// Time-based theme: Light mode during day (6 AM - 6 PM), dark mode at night
function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  // Day time: 6 AM (6) to 6 PM (18)
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return stored || 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return getTimeBasedTheme();
    }
    return theme;
  });

  // Update resolved theme when theme changes or time changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(getTimeBasedTheme());
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    // For system theme, check every minute if we need to switch based on time
    let intervalId: NodeJS.Timeout | null = null;
    if (theme === 'system') {
      intervalId = setInterval(() => {
        const newTheme = getTimeBasedTheme();
        setResolvedTheme(prev => {
          if (prev !== newTheme) {
            return newTheme;
          }
          return prev;
        });
      }, 60000); // Check every minute
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
