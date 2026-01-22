import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Car, Users, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { usePendingInvites } from '@/hooks/useEventInvites';

const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  { path: '/rides', icon: Car, label: 'Rides', tutorialId: 'nav-rides' },
  { path: '/notifications', icon: Bell, label: 'Alerts', tutorialId: 'nav-notifications' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
  { path: '/profile', icon: User, label: 'Profile', tutorialId: 'nav-profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { data: notifications } = useNotifications();
  const { data: pendingInvites } = usePendingInvites();

  const unreadNotifications = notifications?.filter((n) => !n.read).length || 0;
  const pendingInviteCount = pendingInvites?.length || 0;
  const totalUnread = unreadNotifications + pendingInviteCount;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
              <div
                className={cn(
                  "p-2.5 rounded-2xl transition-all duration-300 relative",
                  isActive
                    ? "bg-gradient-to-br from-primary to-orange-500 shadow-lg shadow-primary/30"
                    : "bg-transparent hover:bg-muted"
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
                      // Use semantic tokens (no custom colors)
                      "bg-destructive text-destructive-foreground"
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
      {/* Safe area padding for devices with gesture navigation */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
