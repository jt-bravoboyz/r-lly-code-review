import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Car, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  { path: '/rides', icon: Car, label: 'Rides', tutorialId: 'nav-rides' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
  { path: '/profile', icon: User, label: 'Profile', tutorialId: 'nav-profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white to-white/95 backdrop-blur-lg border-t border-primary/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {/* Extra padding for Android navigation buttons */}
      <div className="container flex h-20 pb-4 items-center justify-around">
        {navItems.map(({ path, icon: Icon, label, tutorialId }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          
          return (
            <Link
              key={path}
              to={path}
              data-tutorial={tutorialId}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-all duration-300",
                isActive 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:scale-105"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-br from-primary to-orange-500 shadow-lg shadow-primary/30" 
                  : "bg-transparent hover:bg-muted"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-all",
                  isActive ? "text-white" : "text-current"
                )} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "transition-all",
                isActive ? "font-bold text-primary" : "font-medium"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with gesture navigation */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
