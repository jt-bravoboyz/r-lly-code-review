import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Users, Bell, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useTutorial } from '@/hooks/useTutorial';
import { usePendingFriendRequestCount } from '@/hooks/usePendingFriendRequests';

const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  { path: '/notifications', icon: Bell, label: 'Alerts', tutorialId: 'nav-notifications' },
  { path: '/tabs', icon: Receipt, label: 'Tab', tutorialId: 'nav-tabs' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
];

export function BottomNav() {
  const location = useLocation();
  const totalUnread = useUnreadCount();
  const { data: pendingFriendCount = 0 } = usePendingFriendRequestCount();
  const { isActive: tutorialActive, currentStep } = useTutorial();

  const navTargetsNav = tutorialActive && !!currentStep?.targetSelector?.startsWith('[data-tutorial="nav-');

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-card/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_hsl(0_0%_0%/0.06)] dark:bg-card/80 dark:border-white/[0.08] dark:shadow-[0_-8px_32px_hsl(0_0%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.06)]",
        navTargetsNav ? "z-[120]" : "z-50"
      )}
      style={{ WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {navItems.map(({ path, icon: Icon, label, tutorialId }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          const isTutorialTarget = tutorialActive && currentStep?.targetSelector === `[data-tutorial="${tutorialId}"]`;
          const isDimmed = navTargetsNav && !isTutorialTarget;

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full px-2 py-1 text-[11px] font-medium rounded-2xl transition-[opacity,color] duration-[250ms] ease-out",
                isDimmed && "opacity-30",
                isTutorialTarget
                  ? "text-foreground opacity-100"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                data-tutorial={tutorialId}
                className={cn(
                  "p-2 rounded-2xl transition-all duration-300 relative",
                  isActive && !isTutorialTarget && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30",
                  !isActive && !isTutorialTarget && "bg-transparent hover:bg-white/[0.06]"
                )}
                style={
                  isTutorialTarget
                    ? {
                        background:
                          'radial-gradient(circle at center, rgba(244,122,25,0.55) 0%, rgba(244,122,25,0.25) 55%, rgba(244,122,25,0) 80%)',
                        boxShadow:
                          'inset 0 0 18px 2px rgba(244,122,25,0.55), 0 0 24px 4px rgba(244,122,25,0.45)',
                      }
                    : undefined
                }
              >
                {isTutorialTarget && (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#F47A19]"
                      style={{ animation: 'nav-pulse-ring 1.8s ease-out infinite' }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#F47A19]"
                      style={{ animation: 'nav-pulse-ring 1.8s ease-out infinite', animationDelay: '0.6s' }}
                    />
                  </>
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all relative",
                    isTutorialTarget ? "text-[#F47A19]" : isActive ? "text-white" : "text-current"
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

                {path === '/squads' && pendingFriendCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg bg-primary text-primary-foreground"
                    aria-label={`${pendingFriendCount} pending friend request${pendingFriendCount === 1 ? '' : 's'}`}
                  >
                    {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "transition-all",
                isTutorialTarget ? "font-bold text-foreground" : isActive ? "font-bold text-primary" : "font-medium"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
      {navTargetsNav && (
        <style>{`@keyframes nav-pulse-ring {
          0% { transform: scale(1); opacity: 0.85; }
          80% { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }`}</style>
      )}
    </nav>
  );
}
