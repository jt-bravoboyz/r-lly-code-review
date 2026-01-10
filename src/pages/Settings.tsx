import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Battery, 
  Gauge, 
  Zap, 
  Vibrate, 
  Navigation, 
  Volume2, 
  Eye, 
  Bell, 
  Shield, 
  Palette,
  RotateCcw,
  Smartphone,
  MapPin,
  Users,
  Car,
  Calendar,
  Compass,
  Radio,
  Target,
  Hand,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useTutorial } from '@/hooks/useTutorial';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Always light' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Always dark' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Light 6AM-6PM' },
] as const;

const trackingModeOptions = [
  { 
    value: 'high_accuracy', 
    label: 'High Accuracy', 
    icon: Gauge,
    description: 'Best for finding friends. Higher battery usage.',
    color: 'text-red-500'
  },
  { 
    value: 'balanced', 
    label: 'Balanced', 
    icon: Zap,
    description: 'Good accuracy with moderate battery use.',
    color: 'text-yellow-500'
  },
  { 
    value: 'battery_saver', 
    label: 'Battery Saver', 
    icon: Battery,
    description: 'Reduced accuracy to save battery.',
    color: 'text-green-500'
  },
] as const;

const hapticIntensityOptions = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
] as const;

export default function Settings() {
  const { user, loading } = useAuth();
  const { settings, updateSetting, resetSettings, isLoaded } = useAppSettings();
  const { triggerHaptic, isSupported: hapticsSupported } = useHaptics();
  const { theme, setTheme } = useTheme();
  const { startTutorial } = useTutorial();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('privacy');

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleTrackingModeChange = (mode: typeof settings.trackingMode) => {
    updateSetting('trackingMode', mode);
    triggerHaptic('selection');
    toast.success(`Tracking mode set to ${mode.replace('_', ' ')}`);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    triggerHaptic('selection');
    toast.success(`Theme set to ${newTheme}`);
  };

  const handleResetSettings = () => {
    resetSettings();
    setTheme('system');
    triggerHaptic('success');
    toast.success('Settings reset to defaults');
  };

  const testHaptic = () => {
    triggerHaptic('medium');
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
      </div>

      <Header title="Settings" />
      
      <main className="container py-4 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="privacy" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs">
              <Bell className="h-3 w-3 mr-1" />
              Notify
            </TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="haptics" className="text-xs">
              <Vibrate className="h-3 w-3 mr-1" />
              Haptics
            </TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs">
              <Navigation className="h-3 w-3 mr-1" />
              Nav
            </TabsTrigger>
          </TabsList>

          {/* Tracking Settings */}
          <TabsContent value="tracking" className="space-y-4">
            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  Tracking Mode
                </CardTitle>
                <CardDescription>
                  Choose how accurately your location is tracked
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trackingModeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTrackingModeChange(option.value)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                      settings.trackingMode === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      settings.trackingMode === option.value ? "bg-primary/10" : "bg-muted"
                    )}>
                      <option.icon className={cn("h-5 w-5", option.color)} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {settings.trackingMode === option.value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Battery className="h-4 w-4 text-primary" />
                  Battery Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Adaptive Battery</Label>
                      <p className="text-xs text-muted-foreground">
                        Auto-adjust based on battery level
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.adaptiveBattery}
                    onCheckedChange={(checked) => updateSetting('adaptiveBattery', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Display Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Accuracy Indicator</Label>
                      <p className="text-xs text-muted-foreground">
                        Show GPS signal quality
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.showAccuracyIndicator}
                    onCheckedChange={(checked) => updateSetting('showAccuracyIndicator', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Distance in Feet</Label>
                      <p className="text-xs text-muted-foreground">
                        Show distances in feet instead of meters
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.showDistanceInFeet}
                    onCheckedChange={(checked) => updateSetting('showDistanceInFeet', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Haptics Settings */}
          <TabsContent value="haptics" className="space-y-4">
            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-primary" />
                  Haptic Feedback
                </CardTitle>
                <CardDescription>
                  {hapticsSupported 
                    ? "Feel vibrations for navigation events"
                    : "Haptic feedback not supported on this device"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Enable Haptics</Label>
                      <p className="text-xs text-muted-foreground">
                        Master toggle for all vibrations
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.hapticsEnabled}
                    onCheckedChange={(checked) => updateSetting('hapticsEnabled', checked)}
                    disabled={!hapticsSupported}
                  />
                </div>

                {settings.hapticsEnabled && (
                  <>
                    <div className="pt-3 border-t border-border">
                      <Label className="text-sm font-medium mb-3 block">Intensity</Label>
                      <div className="flex gap-2">
                        {hapticIntensityOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateSetting('hapticIntensity', option.value);
                              triggerHaptic('medium');
                            }}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                              settings.hapticIntensity === option.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border space-y-3">
                      <Label className="text-sm font-medium">Feedback Types</Label>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Compass className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="font-medium text-sm">Compass Changes</Label>
                            <p className="text-xs text-muted-foreground">
                              When direction shifts significantly
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={settings.hapticCompassChange}
                          onCheckedChange={(checked) => updateSetting('hapticCompassChange', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Radio className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="font-medium text-sm">Proximity Alerts</Label>
                            <p className="text-xs text-muted-foreground">
                              When approaching a friend
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={settings.hapticProximityAlerts}
                          onCheckedChange={(checked) => updateSetting('hapticProximityAlerts', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Navigation className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="font-medium text-sm">Navigation Cues</Label>
                            <p className="text-xs text-muted-foreground">
                              Turns and arrival notifications
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={settings.hapticNavigationCues}
                          onCheckedChange={(checked) => updateSetting('hapticNavigationCues', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Hand className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="font-medium text-sm">Button Feedback</Label>
                            <p className="text-xs text-muted-foreground">
                              Subtle tap on button presses
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={settings.hapticButtonFeedback}
                          onCheckedChange={(checked) => updateSetting('hapticButtonFeedback', checked)}
                        />
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={testHaptic}
                    >
                      <Vibrate className="h-4 w-4 mr-2" />
                      Test Haptic Feedback
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation Settings */}
          <TabsContent value="navigation" className="space-y-4">
            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Voice Guidance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Voice Instructions</Label>
                      <p className="text-xs text-muted-foreground">
                        Spoken turn-by-turn directions
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.voiceGuidance}
                    onCheckedChange={(checked) => updateSetting('voiceGuidance', checked)}
                  />
                </div>

                {settings.voiceGuidance && (
                  <div className="pt-3 border-t border-border">
                    <Label className="text-sm font-medium mb-3 block">
                      Volume: {settings.voiceVolume}%
                    </Label>
                    <Slider
                      value={[settings.voiceVolume]}
                      onValueChange={([value]) => updateSetting('voiceVolume', value)}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Map Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Auto Re-center</Label>
                      <p className="text-xs text-muted-foreground">
                        Keep map centered on your location
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.autoRecenter}
                    onCheckedChange={(checked) => updateSetting('autoRecenter', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-4">
            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun className="h-4 w-4 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Choose your preferred theme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                        theme === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <option.icon className={cn(
                        "h-5 w-5",
                        theme === option.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        theme === option.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  System mode uses light theme during day (6 AM - 6 PM) and dark at night
                </p>
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Share Location by Default</Label>
                      <p className="text-xs text-muted-foreground">
                        Auto-share when joining rallies
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.shareLocationDefault}
                    onCheckedChange={(checked) => updateSetting('shareLocationDefault', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Visible on Map</Label>
                      <p className="text-xs text-muted-foreground">
                        Others can see your location marker
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.showOnMap}
                    onCheckedChange={(checked) => updateSetting('showOnMap', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Allow Friend Requests</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive requests from other users
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.allowFriendRequests}
                    onCheckedChange={(checked) => updateSetting('allowFriendRequests', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>
        </Tabs>

        {/* Tutorial & Reset Buttons */}
        <div className="mt-6 space-y-3">
          <Button 
            variant="outline" 
            className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              localStorage.removeItem('rally-tutorial-complete');
              navigate('/');
              startTutorial();
              toast.success('Basic training restarted!');
            }}
          >
            <Target className="h-4 w-4 mr-2" />
            Restart Basic Training
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleResetSettings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Settings
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
