import React from 'react';
import { Battery, BatteryCharging, BatteryLow, BatteryMedium, Wifi, Radio, Gauge, Zap, MapPin, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLocationContext } from '@/contexts/LocationContext';
import type { TrackingMode } from '@/hooks/useBatteryOptimizedLocation';

const trackingModeInfo: Record<TrackingMode, { label: string; description: string; icon: React.ReactNode }> = {
  high_accuracy: {
    label: 'High Accuracy',
    description: 'Best for finding friends quickly. Higher battery usage.',
    icon: <Gauge className="h-4 w-4" />,
  },
  balanced: {
    label: 'Balanced',
    description: 'Good accuracy with moderate battery usage.',
    icon: <Radio className="h-4 w-4" />,
  },
  battery_saver: {
    label: 'Battery Saver',
    description: 'Reduced updates to save battery. Best for long events.',
    icon: <Battery className="h-4 w-4" />,
  },
};

const movementStateLabels: Record<string, { label: string; color: string }> = {
  stationary: { label: 'Standing Still', color: 'bg-blue-500' },
  walking: { label: 'Walking', color: 'bg-green-500' },
  running: { label: 'Running', color: 'bg-yellow-500' },
  driving: { label: 'In Vehicle', color: 'bg-purple-500' },
};

export function TrackingSettings() {
  const {
    trackingMode,
    setTrackingMode,
    movementState,
    updateInterval,
    batteryInfo,
    isAdaptiveBatteryEnabled,
    setAdaptiveBatteryEnabled,
    indoorInfo,
    startIndoorPositioning,
    stopIndoorPositioning,
    nearbyBeacons,
    isTracking,
  } = useLocationContext();

  const getBatteryIcon = () => {
    if (batteryInfo.charging) return <BatteryCharging className="h-5 w-5 text-green-500" />;
    if (batteryInfo.level === null) return <Battery className="h-5 w-5 text-muted-foreground" />;
    if (batteryInfo.level < 0.2) return <BatteryLow className="h-5 w-5 text-red-500" />;
    if (batteryInfo.level < 0.5) return <BatteryMedium className="h-5 w-5 text-yellow-500" />;
    return <Battery className="h-5 w-5 text-green-500" />;
  };

  const getBatteryImpactColor = () => {
    switch (batteryInfo.estimatedImpact) {
      case 'low': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'high': return 'bg-red-500/20 text-red-500';
    }
  };

  const movementInfo = movementStateLabels[movementState] || movementStateLabels.stationary;

  return (
    <div className="space-y-4">
      {/* Battery Status */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getBatteryIcon()}
            Battery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Level</span>
            <span className="text-sm font-medium">
              {batteryInfo.level !== null ? `${Math.round(batteryInfo.level * 100)}%` : 'Unknown'}
              {batteryInfo.charging && ' (Charging)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated Impact</span>
            <Badge className={getBatteryImpactColor()}>
              {batteryInfo.estimatedImpact.charAt(0).toUpperCase() + batteryInfo.estimatedImpact.slice(1)}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="adaptive-battery">Adaptive Battery</Label>
              <p className="text-xs text-muted-foreground">
                Auto-adjust tracking based on battery level
              </p>
            </div>
            <Switch
              id="adaptive-battery"
              checked={isAdaptiveBatteryEnabled}
              onCheckedChange={setAdaptiveBatteryEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking Mode */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Tracking Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(trackingModeInfo) as TrackingMode[]).map((mode) => {
            const info = trackingModeInfo[mode];
            const isActive = trackingMode === mode;
            
            return (
              <button
                key={mode}
                onClick={() => setTrackingMode(mode)}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 bg-background/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Movement Status */}
      {isTracking && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Movement</span>
              <Badge className={`${movementInfo.color}/20 text-foreground`}>
                <span className={`h-2 w-2 rounded-full ${movementInfo.color} mr-2`} />
                {movementInfo.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Update Interval</span>
              <span className="text-sm font-medium">
                {updateInterval < 1000 ? `${updateInterval}ms` : `${updateInterval / 1000}s`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indoor Positioning */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Indoor Positioning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!indoorInfo.isSupported ? (
            <div className="text-sm text-muted-foreground">
              <p>Indoor positioning requires Bluetooth support.</p>
              <p className="text-xs mt-1">Use a compatible browser (Chrome, Edge) on a device with Bluetooth.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Beacon Scanning</Label>
                  <p className="text-xs text-muted-foreground">
                    Find friends indoors using Bluetooth beacons
                  </p>
                </div>
                <Button
                  variant={indoorInfo.isActive ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => indoorInfo.isActive ? stopIndoorPositioning() : startIndoorPositioning()}
                >
                  {indoorInfo.isActive ? 'Stop' : 'Start'}
                </Button>
              </div>

              {indoorInfo.isActive && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {indoorInfo.venueName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Venue</span>
                        <span className="text-sm font-medium">{indoorInfo.venueName}</span>
                      </div>
                    )}
                    {indoorInfo.floor && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Floor</span>
                        <Badge variant="outline">Level {indoorInfo.floor}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Beacons Found</span>
                      <Badge variant="secondary">
                        <Wifi className="h-3 w-3 mr-1" />
                        {indoorInfo.beaconCount}
                      </Badge>
                    </div>
                  </div>

                  {nearbyBeacons.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Nearby Beacons</p>
                        {nearbyBeacons.slice(0, 3).map((beacon) => (
                          <div
                            key={beacon.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Radio className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium">{beacon.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {beacon.distance.toFixed(1)}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
