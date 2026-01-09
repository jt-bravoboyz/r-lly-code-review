import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, Navigation, RefreshCw, Volume2, VolumeX, Locate, Play, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocationContext } from '@/contexts/LocationContext';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { toast } from 'sonner';

interface NavigationTarget {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
}

interface TurnByTurnNavProps {
  target: NavigationTarget;
  onClose: () => void;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

export function TurnByTurnNav({ target, onClose }: TurnByTurnNavProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const targetMarker = useRef<mapboxgl.Marker | null>(null);
  
  const { currentPosition, compassHeading } = useLocationContext();
  const { token: MAPBOX_TOKEN, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [eta, setEta] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<number>>(new Set());
  const [pulseAlert, setPulseAlert] = useState<{ label: string; color: string } | null>(null);
  const [simulatedDistance, setSimulatedDistance] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);

  // Proximity thresholds in meters (50ft ≈ 15m, 20ft ≈ 6m, 10ft ≈ 3m)
  const PROXIMITY_ALERTS = [
    { distance: 15, label: '50 feet', vibrationPattern: [100], color: 'bg-yellow-500', frequency: 440 },
    { distance: 6, label: '20 feet', vibrationPattern: [100, 50, 100], color: 'bg-orange-500', frequency: 660 },
    { distance: 3, label: '10 feet', vibrationPattern: [100, 50, 100, 50, 200], color: 'bg-green-500', frequency: 880 },
  ];

  // Trigger haptic feedback
  const triggerHaptic = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Play proximity sound effect
  const playProximitySound = useCallback((frequency: number, duration: number = 200) => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContext.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }, []);

  // Simulate walking toward target
  const startSimulation = useCallback(() => {
    setIsSimulating(true);
    setSimulatedDistance(20); // Start at 20 meters
    setTriggeredAlerts(new Set()); // Reset alerts
  }, []);

  const stepSimulation = useCallback(() => {
    setSimulatedDistance(prev => {
      if (prev === null) return null;
      const newDistance = prev - 5; // Move 5 meters closer
      if (newDistance <= 0) {
        setIsSimulating(false);
        return null;
      }
      return newDistance;
    });
  }, []);

  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Speak instruction using Web Speech API
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Fetch route from Mapbox Directions API
  const fetchRoute = useCallback(async () => {
    if (!currentPosition || !MAPBOX_TOKEN) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${currentPosition.lng},${currentPosition.lat};${target.lng},${target.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Update route line on map
        if (map.current?.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          });
        }

        // Parse steps
        const newSteps: RouteStep[] = route.legs[0].steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          maneuver: step.maneuver.type,
        }));
        
        setSteps(newSteps);
        setTotalDistance(route.distance);
        setTotalDuration(route.duration);
        
        // Calculate ETA
        const etaTime = new Date(Date.now() + route.duration * 1000);
        setEta(etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      toast.error('Failed to get directions');
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition, target.lat, target.lng]);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || mapInitialized) return;

    setMapInitialized(true);
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const initialCenter = currentPosition 
      ? [currentPosition.lng, currentPosition.lat] as [number, number]
      : [target.lng, target.lat] as [number, number];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: initialCenter,
      zoom: 16,
      pitch: 60,
      bearing: compassHeading || 0,
    });

    map.current.on('load', () => {
      // Add route line source
      map.current?.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      });

      // Add route line layer
      map.current?.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 8,
          'line-opacity': 0.8,
        },
      });

      // Create user marker
      const userEl = document.createElement('div');
      userEl.className = 'user-marker';
      userEl.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 10px solid #3b82f6;
          "></div>
        </div>
      `;
      
      userMarker.current = new mapboxgl.Marker({ element: userEl })
        .setLngLat(initialCenter)
        .addTo(map.current!);

      // Create target marker
      const targetEl = document.createElement('div');
      targetEl.className = 'target-marker';
      targetEl.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #f97316;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 16px;
        ">${target.displayName?.charAt(0)?.toUpperCase() || '?'}</div>
      `;
      
      targetMarker.current = new mapboxgl.Marker({ element: targetEl })
        .setLngLat([target.lng, target.lat])
        .addTo(map.current!);

      // Fetch initial route
      fetchRoute();
    });

    // Disable following when user interacts with map
    map.current.on('dragstart', () => setIsFollowing(false));
    map.current.on('zoomstart', () => setIsFollowing(false));

    return () => {
      map.current?.remove();
    };
  }, [MAPBOX_TOKEN, mapInitialized]);

  // Update user position and bearing
  useEffect(() => {
    if (!map.current || !currentPosition) return;

    const coords: [number, number] = [currentPosition.lng, currentPosition.lat];
    
    // Update user marker position
    userMarker.current?.setLngLat(coords);

    // Update map position if following
    if (isFollowing) {
      map.current.easeTo({
        center: coords,
        bearing: compassHeading || 0,
        duration: 300,
      });
    }

    // Check if we've completed steps based on proximity
    if (steps.length > 0 && currentStepIndex < steps.length - 1) {
      // Simple distance check - if total remaining is much less, advance step
      const directDistance = Math.sqrt(
        Math.pow((target.lat - currentPosition.lat) * 111000, 2) +
        Math.pow((target.lng - currentPosition.lng) * 111000 * Math.cos(currentPosition.lat * Math.PI / 180), 2)
      );
      
      // Check proximity alerts (from farthest to closest)
      PROXIMITY_ALERTS.forEach((alert) => {
        if (directDistance <= alert.distance && !triggeredAlerts.has(alert.distance)) {
          // Trigger haptic feedback
          triggerHaptic(alert.vibrationPattern);
          
          // Play sound effect
          playProximitySound(alert.frequency, 300);
          
          // Show visual pulse
          setPulseAlert({ label: alert.label, color: alert.color });
          setTimeout(() => setPulseAlert(null), 2000);
          
          // Announce proximity
          speak(`${target.displayName} is within ${alert.label}!`);
          toast.success(`${target.displayName} is within ${alert.label}!`, {
            duration: 3000,
          });
          
          // Mark this alert as triggered
          setTriggeredAlerts(prev => new Set([...prev, alert.distance]));
        }
      });
      
      // If we're very close to target (arrived)
      if (directDistance < 3) {
        speak(`You have arrived at ${target.displayName}'s location`);
        toast.success(`You've found ${target.displayName}!`);
      }
    }
  }, [currentPosition, compassHeading, isFollowing, steps, currentStepIndex, target, speak, triggeredAlerts, triggerHaptic, PROXIMITY_ALERTS]);

  // Handle simulated proximity alerts
  useEffect(() => {
    if (simulatedDistance === null) return;
    
    PROXIMITY_ALERTS.forEach((alert) => {
      if (simulatedDistance <= alert.distance && !triggeredAlerts.has(alert.distance)) {
        // Trigger haptic feedback
        triggerHaptic(alert.vibrationPattern);
        
        // Play sound effect
        playProximitySound(alert.frequency, 300);
        
        // Show visual pulse
        setPulseAlert({ label: alert.label, color: alert.color });
        setTimeout(() => setPulseAlert(null), 2000);
        
        // Announce proximity
        speak(`${target.displayName} is within ${alert.label}!`);
        toast.success(`[SIMULATION] ${target.displayName} is within ${alert.label}!`, {
          duration: 3000,
        });
        
        // Mark this alert as triggered
        setTriggeredAlerts(prev => new Set([...prev, alert.distance]));
      }
    });
    
    // Check if arrived
    if (simulatedDistance <= 2) {
      speak(`You have arrived at ${target.displayName}'s location`);
      toast.success(`[SIMULATION] You've found ${target.displayName}!`);
      setIsSimulating(false);
      setSimulatedDistance(null);
    }
  }, [simulatedDistance, triggeredAlerts, triggerHaptic, playProximitySound, speak, target.displayName, PROXIMITY_ALERTS]);

  // Refresh route periodically
  useEffect(() => {
    const interval = setInterval(fetchRoute, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRoute]);

  // Re-center on user
  const handleRecenter = () => {
    if (!map.current || !currentPosition) return;
    setIsFollowing(true);
    map.current.easeTo({
      center: [currentPosition.lng, currentPosition.lat],
      bearing: compassHeading || 0,
      zoom: 16,
      pitch: 60,
      duration: 500,
    });
  };

  const currentStep = steps[currentStepIndex];

  if (tokenLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading navigation...</p>
        </div>
      </div>
    );
  }

  if (!MAPBOX_TOKEN || tokenError) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{tokenError || 'Mapbox token not configured'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Proximity pulse overlay */}
      {pulseAlert && (
        <div className="absolute inset-0 z-[60] pointer-events-none animate-pulse">
          <div className={`absolute inset-0 ${pulseAlert.color} opacity-30`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${pulseAlert.color} text-white px-8 py-4 rounded-2xl text-2xl font-bold font-montserrat shadow-2xl animate-bounce`}>
              {pulseAlert.label} away!
            </div>
          </div>
        </div>
      )}
      
      {/* Map */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Top bar - destination info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pt-12">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-white">
            <AvatarImage src={target.avatarUrl || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
              {target.displayName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-white">
            <p className="text-sm opacity-80">Navigating to</p>
            <p className="font-bold text-lg font-montserrat">{target.displayName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Current step instruction */}
      {currentStep && (
        <div className="absolute top-32 left-4 right-4">
          <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Navigation className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{currentStep.instruction}</p>
                <p className="text-sm opacity-80">
                  {formatDistance(currentStep.distance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom panel - route overview */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl">
        <div className="p-4 pb-8 safe-area-inset-bottom">
          {/* Handle bar */}
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
          
          {/* ETA and distance */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-primary font-montserrat">
                {formatDuration(totalDuration)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDistance(totalDistance)} · ETA {eta}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
              >
                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={fetchRoute}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant={isFollowing ? 'default' : 'outline'}
                size="icon"
                className="rounded-full"
                onClick={handleRecenter}
              >
                <Locate className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Step list preview */}
          {steps.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {steps.slice(currentStepIndex, currentStepIndex + 3).map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    idx === 0 ? 'bg-primary/10' : 'opacity-60'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {currentStepIndex + idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{step.instruction}</p>
                    <p className="text-xs text-muted-foreground">{formatDistance(step.distance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Debug simulation controls */}
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">🧪 Debug: Simulate Walk</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={startSimulation}
                disabled={isSimulating}
              >
                <Play className="h-4 w-4 mr-1" />
                Start (20m)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={stepSimulation}
                disabled={!isSimulating}
              >
                <FastForward className="h-4 w-4 mr-1" />
                Step (-5m)
              </Button>
            </div>
            {simulatedDistance !== null && (
              <p className="text-xs text-center mt-2 text-primary font-medium">
                Simulated distance: {simulatedDistance}m
              </p>
            )}
          </div>

          {/* External maps button */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=walking`;
              window.open(url, '_blank');
            }}
          >
            Open in Google Maps
          </Button>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && steps.length === 0 && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Calculating route...</p>
          </div>
        </div>
      )}
    </div>
  );
}