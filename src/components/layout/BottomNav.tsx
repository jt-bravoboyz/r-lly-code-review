import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Users, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';

const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  { path: '/notifications', icon: Bell, label: 'Alerts', tutorialId: 'nav-notifications' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
  { path: '/profile', icon: User, label: 'Profile', tutorialId: 'nav-profile' },
];

export function BottomNav() {
  const location = useLocation();
  const totalUnread = useUnreadCount();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-[0_4px_24px_hsl(0_0%_0%/0.08)] dark:bg-card/60 dark:border-white/[0.08] dark:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="flex h-16 items-center justify-around px-2">
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
              <div
                className={cn(
                  "p-3 rounded-2xl transition-all duration-300 relative",
                  isActive
                    ? "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30"
                    : "bg-transparent hover:bg-white/[0.06]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive ? "text-white" : "text-current"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {path === '/notifications' && totalUnread > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg",
                      "bg-primary text-primary-foreground"
                    )}
                    aria-label={`${totalUnread} unread notifications`}
                  >
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
              <span className={cn(
                "transition-all",
                isActive ? "font-bold text-primary" : "font-medium"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
