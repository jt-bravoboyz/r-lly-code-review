import { Bell, Beer, Car, Home, Users, Calendar, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';

interface NotificationOption {
  key: keyof Omit<import('@/hooks/useNotificationPreferences').NotificationPreferences, 'id' | 'profile_id'>;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const notificationOptions: NotificationOption[] = [
  {
    key: 'bar_hop_transitions',
    label: 'Bar Hop Transitions',
    description: 'When the host moves to the next stop',
    icon: <Beer className="h-4 w-4 text-secondary" />,
  },
  {
    key: 'ride_offers',
    label: 'Ride Offers',
    description: 'When someone offers a ride',
    icon: <Car className="h-4 w-4 text-blue-500" />,
  },
  {
    key: 'ride_requests',
    label: 'Ride Requests',
    description: 'When someone requests a ride from you',
    icon: <Car className="h-4 w-4 text-green-500" />,
  },
  {
    key: 'arrival_confirmations',
    label: 'Safe Arrivals',
    description: 'When friends arrive home safely',
    icon: <Home className="h-4 w-4 text-primary" />,
  },
  {
    key: 'going_home_alerts',
    label: 'Going Home Alerts',
    description: 'When someone is heading home',
    icon: <Home className="h-4 w-4 text-orange-500" />,
  },
  {
    key: 'event_updates',
    label: 'Event Updates',
    description: 'Location changes and event announcements',
    icon: <Calendar className="h-4 w-4 text-purple-500" />,
  },
  {
    key: 'squad_invites',
    label: 'Squad Invites',
    description: 'When invited to join a squad',
    icon: <UserPlus className="h-4 w-4 text-indigo-500" />,
  },
];

export function NotificationSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = (key: NotificationOption['key'], value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Push Notifications Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            {isSupported 
              ? 'Get notified even when the app is in the background'
              : 'Push notifications are not supported on this device'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSupported ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed 
                    ? 'You will receive push notifications'
                    : 'Enable to receive push notifications'
                  }
                </p>
              </div>
              <Button
                variant={isSubscribed ? 'outline' : 'default'}
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={pushLoading}
              >
                {pushLoading 
                  ? 'Loading...' 
                  : isSubscribed 
                    ? 'Disable' 
                    : 'Enable'
                }
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your browser does not support push notifications. Try using Chrome or Safari on iOS.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Individual Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {option.icon}
                </div>
                <div>
                  <Label htmlFor={option.key} className="font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                id={option.key}
                checked={preferences?.[option.key] ?? true}
                onCheckedChange={(checked) => handleToggle(option.key, checked)}
                disabled={updatePreferences.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
