import { useState, useRef } from 'react';
import { getPublicName } from '@/lib/identity';
import { MiniFounderGem } from '@/components/badges/MiniFounderGem';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, LogOut, MapPin, Award, Camera, Users, Home, Shield, Pencil, Save, X, FileText, ChevronRight, Navigation, Phone, Mail, CreditCard, Contact, CheckCircle2, Send, Star, History, RotateCcw } from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { ContactSyncButton } from '@/components/contacts/ContactSyncButton';
import { ContactInviteDialog } from '@/components/contacts/ContactInviteDialog';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/location/LocationSearch';
import { AvatarCropperDialog } from '@/components/profile/AvatarCropperDialog';
import { AvatarSourceSheet } from '@/components/profile/AvatarSourceSheet';
import { useBadgeState, useActivityBadges } from '@/hooks/useBadgeSystem';
import { TierBadgeIcon } from '@/components/badges/TierBadgeIcon';
import { ActivityBadgeIcon } from '@/components/badges/ActivityBadgeIcon';
import { getBadgeMeta } from '@/lib/badges';
import { PaymentMethodSection } from '@/components/profile/PaymentMethodSection';


// Helper to format phone for display
function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Helper to normalize phone for storage
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, '');
  if (normalized.length === 10) {
    normalized = '+1' + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('1')) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editName, setEditName] = useState(''); // legacy display_name (kept for fallback save)
  const [editFullName, setEditFullName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isHomeDialogOpen, setIsHomeDialogOpen] = useState(false);
  const [isSavingHome, setIsSavingHome] = useState(false);
  const [homeSearchValue, setHomeSearchValue] = useState('');
  
  // Avatar upload state
  const [avatarSourceOpen, setAvatarSourceOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { toggleLocationSharing } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const { data: phoneContacts = [] } = usePhoneContacts();
  const [contactInviteOpen, setContactInviteOpen] = useState(false);
  
  // Badge system hooks
  const { state: badgeState, currentTier, nextTier, progress } = useBadgeState();
  const { badges: activityBadges } = useActivityBadges();

  // Handle image selection from file input
  const handleImageSelected = (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Image must be less than 50MB');
      return;
    }
    
    // Use FileReader to convert to data URL for better mobile compatibility
    // (handles HEIC and other formats that URL.createObjectURL may not render)
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setSelectedImageSrc(dataUrl);
        setCropperOpen(true);
      } else {
        toast.error('Failed to read image file');
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle cropped image upload
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user || !profile) return;
    
    setUploadingAvatar(true);
    setCropperOpen(false);
    
    try {
      const fileName = `${user.id}/avatar.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Cache-bust to force refresh
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;
      
      await refreshProfile();
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      if (selectedImageSrc) {
        setSelectedImageSrc(null);
      }
    }
  };

  const handleSaveHomeAddress = async (location: { name: string; address: string; lat: number; lng: number }) => {
    if (!profile?.id) return;
    setIsSavingHome(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ home_address: location.address, home_lat: location.lat, home_lng: location.lng })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      setIsHomeDialogOpen(false);
      toast.success('Home address saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save home address');
    } finally {
      setIsSavingHome(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
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
    setEditFullName((profile as any)?.full_name || profile?.display_name || '');
    setEditNickname((profile as any)?.nickname || '');
    setEditBio((profile as any)?.bio || '');
    setEditPhone(profile?.phone ? formatPhoneForDisplay(profile.phone) : '');
    setEditEmail(user?.email || '');
    setIsEditing(true);
  };

  const handlePhoneChange = (value: string) => {
    // Format as user types: (555) 123-4567
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = '(' + cleaned.slice(0, 3);
      if (cleaned.length > 3) {
        formatted += ') ' + cleaned.slice(3, 6);
      }
      if (cleaned.length > 6) {
        formatted += '-' + cleaned.slice(6, 10);
      }
    }
    setEditPhone(formatted);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      // Normalize phone if provided
      const phoneDigits = editPhone.replace(/\D/g, '');
      const normalizedPhone = phoneDigits.length >= 10 ? normalizePhoneNumber(phoneDigits) : null;

      const trimmedFull = editFullName.trim();
      const trimmedNick = editNickname.trim();

      const updatePayload: Record<string, any> = {
        full_name: trimmedFull || null,
        nickname: trimmedNick || null,
        bio: editBio.trim() || null,
        phone: normalizedPhone,
      };
      // The DB trigger will set display_name = COALESCE(nickname, full_name).
      // For legacy safety, if both are empty, keep whatever editName had.
      if (!trimmedFull && !trimmedNick && editName.trim()) {
        updatePayload.display_name = editName.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id);

      if (error) throw error;

      // Sync email with auth if changed
      const trimmedEmail = editEmail.trim().toLowerCase();
      if (trimmedEmail && trimmedEmail !== user?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          toast.error('Please enter a valid email address');
          setIsSaving(false);
          return;
        }
        const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (emailError) {
          toast.error(emailError.message);
          setIsSaving(false);
          return;
        }
        toast.info('Check your new email for a verification link to finalize the change.');
      }

      // Sync phone with auth if changed
      if (normalizedPhone && normalizedPhone !== user?.phone) {
        await supabase.auth.updateUser({ phone: normalizedPhone });
      }

      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-scroll focused field into view above the keyboard / sticky bar
  const handleFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
  };

  return (
    <div className={`min-h-[100dvh] ${isEditing ? 'pb-44' : 'pb-bottom-nav'} scroll-pb-44 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden`}>
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
                  onClick={() => setAvatarSourceOpen(true)}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
                />
              </div>
              
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2 mb-1">
                    <div className="space-y-1">
                      <Input
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="text-xl font-bold"
                        placeholder="Nickname (optional)"
                        maxLength={30}
                      />
                      <p className="text-[11px] text-muted-foreground px-1">
                        This is your R@lly handle. If left blank, we'll use your real name.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="text-sm"
                        placeholder="Full name (First Last)"
                        maxLength={100}
                      />
                      <p className="text-[11px] text-muted-foreground px-1">
                        Legal/real name. Used for safety check-ins (R@lly Home, DD) and admin records.
                      </p>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-xl font-bold inline-flex items-center">
                    {getPublicName(profile)}
                    {profile?.id && <MiniFounderGem profileId={profile.id} />}
                  </h2>
                )}
                {isEditing ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      onFocus={handleFieldFocus}
                      className="h-8 text-sm"
                      placeholder="email@example.com"
                      type="email"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                )}
                
                {isEditing ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onFocus={handleFieldFocus}
                      className="h-8 text-sm"
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                ) : (
                  profile?.phone && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {formatPhoneForDisplay(profile.phone)}
                    </div>
                  )
                )}
                
                {/* Founding Member Badge */}
                {profile?.founding_member && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.2)]">
                      <Star className="h-3.5 w-3.5 text-primary fill-primary/40" />
                      <span className="text-xs font-bold text-primary">
                        {profile.founder_number ? `Founder #${profile.founder_number}` : 'Founding Member'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tier and Points Display */}
                <div className="flex items-center gap-2 mt-2">
                  {currentTier && (
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer"
                      onClick={() => navigate('/achievements')}
                    >
                      <TierBadgeIcon tier={currentTier} size="sm" />
                      <span className="text-sm font-medium">{currentTier.tier_name}</span>
                    </div>
                  )}
                  <div 
                    className="badge-rally cursor-pointer"
                    onClick={() => navigate('/achievements')}
                  >
                    <Award className="h-3 w-3" />
                    <span>{badgeState?.total_points || profile?.reward_points || 0} pts</span>
                  </div>
                </div>

                {/* Progress to next tier */}
                {nextTier && (
                  <div className="mt-2 w-full">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{progress.pointsToNext} pts to {nextTier.tier_name}</span>
                      <span>{Math.round(progress.percent)}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                  </div>
                )}
              </div>

              {/* Edit button - only shown when not editing; sticky bar handles save/cancel */}
              {!isEditing && (
                <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Bio section */}
            <div className="mt-4 pt-4 border-t border-border">
              {isEditing ? (
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  onFocus={handleFieldFocus}
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

            {/* Earned Activity Badges */}
            {activityBadges && activityBadges.filter(b => b.isEarned).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground w-full mb-1">Earned Badges</span>
                <div className="flex gap-2">
                  {activityBadges.filter(b => b.isEarned).slice(0, 6).map((badge) => (
                    <ActivityBadgeIcon 
                      key={badge.badge_key} 
                      badge={badge}
                      progress={{ 
                        current: badge.progress_count, 
                        required: badge.nextTierThreshold, 
                        isEarned: true 
                      }}
                      tierLevel={badge.current_tier_level}
                      size="sm"
                      showProgress={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {profile.badges
                  .filter((b) => !b.startsWith('founder_') && b !== 'founding_member')
                  .map((badge, index) => {
                    const meta = getBadgeMeta(badge);
                    return (
                      <span key={index} className={meta.className}>
                        {meta.label}
                      </span>
                    );
                  })}
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
              <div className="text-lg font-bold">
                {activityBadges?.find(b => b.badge_key === 'active_duty')?.progress_count ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Rally</div>
            </CardContent>
          </Card>
          <Card className="card-rally hover:ring-2 hover:ring-primary/30 transition-all">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">
                {activityBadges?.find(b => b.badge_key === 'convoy_captain')?.progress_count ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">DD Trips</div>
            </CardContent>
          </Card>
          <Card className="card-rally hover:ring-2 hover:ring-primary/30 transition-all">
            <CardContent className="p-4 text-center">
              <Home className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">
                {activityBadges?.find(b => b.badge_key === 'enlisted')?.progress_count ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Safe Homes</div>
            </CardContent>
          </Card>
        </div>

        {/* View All Badges Link */}
        <button 
          onClick={() => navigate('/achievements')}
          className="w-full flex items-center justify-between py-3 px-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            <span className="font-medium">View all badges & rewards</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Admin Panel Link - only visible for admins */}
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between py-3 px-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">Admin Dashboard</span>
            </div>
            <ChevronRight className="h-5 w-5 text-primary/60" />
          </button>
        )}

        {/* Payments */}
        <PaymentMethodSection />
        

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

            <div className="pt-3 border-t border-border">
              <Dialog open={isHomeDialogOpen} onOpenChange={setIsHomeDialogOpen}>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors">
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <span className="font-medium">Home Address</span>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {profile?.home_address || 'Set your home for R@lly Home'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-primary" />
                      Set Home Address
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your home address is used for the R@lly Home feature to help you get home safely after events.
                    </p>
                    <LocationSearch
                      value={homeSearchValue}
                      onChange={setHomeSearchValue}
                      onLocationSelect={handleSaveHomeAddress}
                      placeholder="Search for your home address..."
                    />
                    {isSavingHome && (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {profile?.home_address && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Current home address:</p>
                        <p className="text-sm font-medium">{profile.home_address}</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>


            <div className="pt-3 border-t border-border">
              <button
                onClick={() => navigate('/tabs')}
                className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <span className="font-medium">R@lly Wallet</span>
                    <p className="text-xs text-muted-foreground">
                      Split checks, hosted & owed
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="pt-3 border-t border-border">
              <button
                onClick={() => navigate('/rallies/past')}
                className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Past R@llies</span>
                    <p className="text-xs text-muted-foreground">
                      Your full night archive
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

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

      {/* Sticky Edit Mode Action Bar */}
      {isEditing && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/85 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.25)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="container py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-[2] h-12 text-base font-semibold"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!isEditing && <BottomNav />}

      {/* Avatar Source Selection Sheet */}
      <AvatarSourceSheet
        open={avatarSourceOpen}
        onOpenChange={setAvatarSourceOpen}
        onCameraClick={() => cameraInputRef.current?.click()}
        onGalleryClick={() => fileInputRef.current?.click()}
      />

      {/* Contact Invite Dialog */}
      <ContactInviteDialog open={contactInviteOpen} onOpenChange={setContactInviteOpen} />

      {/* Avatar Cropper Dialog */}
      {selectedImageSrc && (
        <AvatarCropperDialog
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open && selectedImageSrc) {
              URL.revokeObjectURL(selectedImageSrc);
              setSelectedImageSrc(null);
            }
          }}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
