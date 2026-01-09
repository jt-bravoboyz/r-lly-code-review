import { useState } from 'react';
import { Header } from '@/components/layout/Header';
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
  Shield, 
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
  Bell,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

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

type TrackingMode = 'high_accuracy' | 'balanced' | 'battery_saver';
type HapticIntensity = 'light' | 'medium' | 'strong';

interface DemoSettings {
  trackingMode: TrackingMode;
  adaptiveBattery: boolean;
  hapticsEnabled: boolean;
  hapticCompassChange: boolean;
  hapticProximityAlerts: boolean;
  hapticNavigationCues: boolean;
  hapticButtonFeedback: boolean;
  hapticIntensity: HapticIntensity;
  voiceGuidance: boolean;
  voiceVolume: number;
  autoRecenter: boolean;
  showDistanceInFeet: boolean;
  shareLocationDefault: boolean;
  showOnMap: boolean;
  allowFriendRequests: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  friendArrivals: boolean;
  rideUpdates: boolean;
  showAccuracyIndicator: boolean;
}

// Demo settings state for preview
const defaultSettings: DemoSettings = {
  trackingMode: 'balanced',
  adaptiveBattery: true,
  hapticsEnabled: true,
  hapticCompassChange: true,
  hapticProximityAlerts: true,
  hapticNavigationCues: true,
  hapticButtonFeedback: true,
  hapticIntensity: 'medium',
  voiceGuidance: true,
  voiceVolume: 80,
  autoRecenter: true,
  showDistanceInFeet: true,
  shareLocationDefault: true,
  showOnMap: true,
  allowFriendRequests: true,
  pushNotifications: true,
  eventReminders: true,
  friendArrivals: true,
  rideUpdates: true,
  showAccuracyIndicator: true,
};

export default function SettingsPreview() {
  const [settings, setSettings] = useState<DemoSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('privacy');
  const { theme, setTheme } = useTheme();

  const updateSetting = <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTrackingModeChange = (mode: TrackingMode) => {
    updateSetting('trackingMode', mode);
    toast.success(`Tracking mode set to ${mode.replace('_', ' ')}`);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
    setTheme('system');
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
      </div>

      <Header title="Settings (Preview)" />
      
      <main className="container py-4 relative z-10">
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-primary font-medium">
            📱 Preview Mode - Changes won't be saved
          </p>
        </div>

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
                  Feel vibrations for navigation events
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
                            onClick={() => updateSetting('hapticIntensity', option.value)}
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
                      onClick={() => toast.info('Haptic test (vibration on real device)')}
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
                        Keep your position centered on map
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
                  Location Sharing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Share by Default</Label>
                      <p className="text-xs text-muted-foreground">
                        Auto-share location when joining events
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
                      <Label className="font-medium">Show on Map</Label>
                      <p className="text-xs text-muted-foreground">
                        Let friends see you on the event map
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.showOnMap}
                    onCheckedChange={(checked) => updateSetting('showOnMap', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Social Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Friend Requests</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow others to send friend requests
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
            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Control how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable all push notifications
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Event Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Event Reminders</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified before events start
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.eventReminders}
                    onCheckedChange={(checked) => updateSetting('eventReminders', checked)}
                    disabled={!settings.pushNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-rally">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Social Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Friend Arrivals</Label>
                      <p className="text-xs text-muted-foreground">
                        Know when friends arrive at events
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.friendArrivals}
                    onCheckedChange={(checked) => updateSetting('friendArrivals', checked)}
                    disabled={!settings.pushNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Ride Updates</Label>
                      <p className="text-xs text-muted-foreground">
                        Ride confirmations and changes
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.rideUpdates}
                    onCheckedChange={(checked) => updateSetting('rideUpdates', checked)}
                    disabled={!settings.pushNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reset Button */}
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={handleResetSettings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Settings to Defaults
          </Button>
        </div>
      </main>
    </div>
  );
}
