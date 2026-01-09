import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, MapPin, Award, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { toggleLocationSharing } = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const handleLocationToggle = async (enabled: boolean) => {
    await toggleLocationSharing(enabled);
    await refreshProfile();
    toast.success(enabled ? 'Location sharing enabled' : 'Location sharing disabled');
  };

  return (
    <div className="min-h-screen pb-20">
      <Header title="Profile" />
      
      <main className="container py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold">{profile?.display_name || 'Anonymous'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                
                {profile?.reward_points !== undefined && profile.reward_points > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Award className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">{profile.reward_points} points</span>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.badges.map((badge, index) => (
                  <Badge key={index} variant="secondary">{badge}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Location Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your location with event attendees
                  </p>
                </div>
              </div>
              <Switch 
                checked={profile?.location_sharing_enabled || false}
                onCheckedChange={handleLocationToggle}
              />
            </div>

            {profile?.home_address && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Home Address</p>
                <p className="font-medium">{profile.home_address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}