import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Users, Bell, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useTutorial } from '@/hooks/useTutorial';

const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  { path: '/notifications', icon: Bell, label: 'Alerts', tutorialId: 'nav-notifications' },
  { path: '/tabs', icon: Receipt, label: 'Wallet', tutorialId: 'nav-tabs' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
];

export function BottomNav() {
  const location = useLocation();
  const totalUnread = useUnreadCount();
  const { isActive: tutorialActive, currentStep } = useTutorial();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-card/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_hsl(0_0%_0%/0.06)] dark:bg-card/80 dark:border-white/[0.08] dark:shadow-[0_-8px_32px_hsl(0_0%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.06)]" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {navItems.map(({ path, icon: Icon, label, tutorialId }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));

          const isTutorialTarget = tutorialActive && currentStep?.targetSelector === `[data-tutorial="${tutorialId}"]`;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full px-2 py-1 text-[11px] font-medium transition-colors duration-300 rounded-2xl"
              , isTutorialTarget
                  ? "text-white"
                  : isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
              )}
            >

              <div
                data-tutorial={tutorialId}
                className={cn(
                  "p-2 rounded-2xl transition-all duration-300 relative",
                  isTutorialTarget
                    ? "bg-[#F47A19] shadow-[0_0_16px_rgba(244,122,25,0.55)] animate-pulse"
                    : isActive
                      ? "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30"
                      : "bg-transparent hover:bg-white/[0.06]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isTutorialTarget ? "text-white" : isActive ? "text-white" : "text-current"
                  )}
                  strokeWidth={isActive || isTutorialTarget ? 2.5 : 2}
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
                isTutorialTarget ? "font-bold text-white" : isActive ? "font-bold text-primary" : "font-medium"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
