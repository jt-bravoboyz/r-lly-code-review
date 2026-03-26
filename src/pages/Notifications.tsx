import { } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Car, MapPin, Users, CheckCircle, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useMarkNotificationRead, useDeleteNotification } from '@/hooks/useNotifications';
import { SwipeDismissCard } from '@/components/notifications/SwipeDismissCard';
import { usePendingInvites } from '@/hooks/useEventInvites';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { PendingInvites } from '@/components/events/PendingInvites';
import { Button } from '@/components/ui/button';
import rallyLogo from '@/assets/rally-logo.png';

export default function Notifications() {
  const { profile, loading: authLoading } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const { data: pendingInvites } = usePendingInvites();
  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-rally-cream flex items-center justify-center">
            <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
          </div>
        </div>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ride_request':
        return <Car className="h-5 w-5 text-blue-500" />;
      case 'ride_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'event_invite':
        return <Users className="h-5 w-5 text-primary" />;
      case 'location_arrived':
        return <MapPin className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const handleNotificationClick = (notificationId: string, read: boolean | null) => {
    if (!read) {
      markRead.mutate(notificationId);
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const pendingInviteCount = pendingInvites?.length || 0;
  const totalUnread = unreadCount + pendingInviteCount;
  const hasNotifications = (notifications && notifications.length > 0) || pendingInviteCount > 0;

  

  return (
    <div className="min-h-[100dvh] pb-24 bg-background relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-72 h-72 rounded-full bg-primary/[0.04] blur-3xl animate-orb-float" />
        <div className="absolute bottom-1/3 -left-16 w-56 h-56 rounded-full bg-primary/[0.03] blur-3xl animate-orb-float-reverse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,hsl(var(--background))_100%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary shadow-[0_4px_30px_hsl(27,91%,53%/0.2)] backdrop-blur-xl border-b border-white/[0.12]" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
        <div style={{ height: 'env(safe-area-inset-top, 1.5rem)' }} />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="relative">
            <div className="absolute inset-0 rounded-full blur-md bg-white/20" />
            <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
          </Link>
          <h1 className="text-xl font-bold text-white font-montserrat drop-shadow-sm flex items-center gap-2">
            <Bell className="h-5 w-5" strokeWidth={2.5} />
            Command
          </h1>
          <Link to="/profile" className="relative group">
            <div className="absolute inset-0 rounded-full blur-md scale-110 bg-white/20" />
            <Avatar className="h-11 w-11 ring-2 ring-white/40 hover:ring-white transition-all relative shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white backdrop-blur-sm text-sm font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>


      <main className="relative z-10 px-4 py-6 space-y-4">
        {/* Header with count */}
        {hasNotifications && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground font-montserrat">Activity</h2>
              <p className="text-sm text-muted-foreground">Stay updated on your squad</p>
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-white shadow-[0_0_12px_hsl(27_91%_53%/0.3)]">
                {totalUnread} new
              </Badge>
            )}
          </div>
        )}

        {/* Pending Rally Invites */}
        <PendingInvites />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/40 border-white/5 rounded-xl backdrop-blur-xl" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`rounded-xl transition-all duration-300 cursor-pointer backdrop-blur-xl ${
                  notification.read
                    ? 'bg-card/60 border-white/10'
                    : 'bg-card/70 border-primary/15 shadow-[0_0_20px_hsl(27_91%_53%/0.06)]'
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.read)}
                style={{ WebkitBackdropFilter: 'blur(20px)' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${notification.read ? 'text-foreground' : 'text-primary'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-[0_0_6px_hsl(27_91%_53%/0.5)]" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {notification.created_at
                            ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Enhanced Empty State */
          <div className="flex flex-col items-center justify-center pt-12 pb-6 space-y-8">
            {/* Bell icon with breathing glow */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full animate-icon-glow-breathe" />
              <div className="relative w-20 h-20 rounded-full bg-card/60 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                <Bell className="h-10 w-10 text-primary drop-shadow-sm" />
              </div>
            </div>

            {/* Headline with shimmer */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold font-montserrat animate-text-shimmer bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                You're locked in
              </h3>
              <p className="text-muted-foreground text-sm max-w-[260px] mx-auto">
                We'll keep you posted when your crew makes a move
              </p>
            </div>

            {/* Smart Anticipation Card */}
            <Card className="w-full max-w-sm animate-card-float backdrop-blur-xl bg-card/60 border-primary/10 shadow-[0_8px_32px_hsl(27_91%_53%/0.06)] hover:shadow-[0_12px_40px_hsl(27_91%_53%/0.1)] hover:-translate-y-0.5 transition-all duration-500" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
              <CardContent className="px-5 pt-6 pb-7 space-y-6">
                <p className="text-base font-bold text-foreground text-center -mt-2">Be the one to get things started</p>
                <Link to="/events">
                  <Button className="w-full" size="sm">
                    <Zap className="h-4 w-4 mr-1.5" />
                    Start a R@lly
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
