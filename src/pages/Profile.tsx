import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings, LogOut, MapPin, Award, Camera, Users, Home, Shield, Pencil, Save, X, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { toggleLocationSharing } = useLocation();
  const navigate = useNavigate();

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

  const handleStartEdit = () => {
    setEditName(profile?.display_name || '');
    setEditBio((profile as any)?.bio || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: editName.trim(),
          bio: editBio.trim() || null 
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
      </div>

      <Header title="Profile" />
      
      <main className="container py-6 space-y-4 relative z-10">
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
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl font-bold mb-1"
                    placeholder="Your name"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{profile?.display_name || 'Anonymous'}</h2>
                )}
                <p className="text-sm text-muted-foreground">{user.email}</p>
                
                <div 
                  className="flex items-center gap-2 mt-2 cursor-pointer"
                  onClick={() => navigate('/achievements')}
                >
                  <div className="badge-rally">
                    <Award className="h-3 w-3" />
                    <span>{profile?.reward_points || 0} points</span>
                  </div>
                </div>
              </div>

              {/* Edit button */}
              {!isEditing ? (
                <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSaveProfile} disabled={isSaving}>
                    <Save className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bio section */}
            <div className="mt-4 pt-4 border-t border-border">
              {isEditing ? (
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="resize-none"
                  rows={3}
                />
              ) : (
                (profile as any)?.bio ? (
                  <p className="text-sm text-muted-foreground">{(profile as any).bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio yet. Tap edit to add one!</p>
                )
              )}
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

        {/* Quick Stats - Clickable to Achievements */}
        <div 
          className="grid grid-cols-3 gap-3 cursor-pointer"
          onClick={() => navigate('/achievements')}
        >
          <Card className="card-rally hover:ring-2 hover:ring-primary/30 transition-all">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">0</div>
              <div className="text-xs text-muted-foreground">Rally</div>
            </CardContent>
          </Card>
          <Card className="card-rally hover:ring-2 hover:ring-primary/30 transition-all">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">0</div>
              <div className="text-xs text-muted-foreground">DD Trips</div>
            </CardContent>
          </Card>
          <Card className="card-rally hover:ring-2 hover:ring-primary/30 transition-all">
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
          <CardContent className="space-y-2">
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

            <div className="pt-3 border-t border-border">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">App Settings</span>
                    <p className="text-xs text-muted-foreground">
                      Tracking, Haptics, Privacy
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="pt-3 border-t border-border">
              <button
                onClick={() => navigate('/legal')}
                className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Legal & Policies</span>
                    <p className="text-xs text-muted-foreground">
                      Privacy, Terms, Guidelines
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
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
