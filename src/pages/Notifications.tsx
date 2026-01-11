import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Car, MapPin, Users, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { usePendingInvites } from '@/hooks/useEventInvites';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { PendingInvites } from '@/components/events/PendingInvites';
import rallyLogo from '@/assets/rally-logo.png';

export default function Notifications() {
  const { profile, loading: authLoading } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const { data: pendingInvites } = usePendingInvites();
  const markRead = useMarkNotificationRead();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
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

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/">
            <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
          </Link>
          <h1 className="text-xl font-bold text-rally-dark font-montserrat">Notifications</h1>
          <Link to="/profile">
            <Avatar className="h-10 w-10 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>
      
      <main className="px-4 py-6 space-y-4">
        {/* Header with count */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-rally-dark font-montserrat">Activity</h2>
            <p className="text-sm text-muted-foreground">Stay updated on your squad</p>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-primary text-white">
              {totalUnread} new
            </Badge>
          )}
        </div>

        {/* Pending Rally Invites */}
        <PendingInvites />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-20 animate-pulse bg-muted border-0 rounded-xl" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`rounded-xl transition-all cursor-pointer ${
                  notification.read 
                    ? 'bg-white' 
                    : 'bg-primary/5 border-primary/20'
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.read)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${notification.read ? 'text-rally-dark' : 'text-primary'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
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
          <Card className="bg-white shadow-sm rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">All caught up!</h3>
              <p className="text-muted-foreground font-montserrat">
                Notifications for rides, events, and your squad will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}