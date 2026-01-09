import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, MapPin, Award, Camera, Users, Home, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { toggleLocationSharing } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
    <div className="min-h-screen pb-24 bg-background">
      <Header title="Profile" />
      
      <main className="container py-6 space-y-4">
        {/* Profile Header */}
        <Card className="card-rally">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full btn-rally"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold">{profile?.display_name || 'Anonymous'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                
                {profile?.reward_points !== undefined && profile.reward_points > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="badge-rally">
                      <Award className="h-3 w-3" />
                      <span>{profile.reward_points} points</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {profile.badges.map((badge, index) => (
                  <span key={index} className="badge-dark">{badge}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="card-rally">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">0</div>
              <div className="text-xs text-muted-foreground">Rallies</div>
            </CardContent>
          </Card>
          <Card className="card-rally">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">0</div>
              <div className="text-xs text-muted-foreground">DD Trips</div>
            </CardContent>
          </Card>
          <Card className="card-rally">
            <CardContent className="p-4 text-center">
              <Home className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">0</div>
              <div className="text-xs text-muted-foreground">Safe Homes</div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card className="card-rally">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Location Sharing</Label>
                  <p className="text-xs text-muted-foreground">
                    Share with rally attendees
                  </p>
                </div>
              </div>
              <Switch 
                checked={profile?.location_sharing_enabled || false}
                onCheckedChange={handleLocationToggle}
              />
            </div>

            {profile?.home_address && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Home Address</Label>
                    <p className="text-sm text-muted-foreground">{profile.home_address}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
