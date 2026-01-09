import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Web Bluetooth API type declarations
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  };
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  device: BluetoothDevice;
}

interface RequestDeviceOptions {
  acceptAllDevices?: boolean;
  filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  optionalServices?: string[];
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  getAvailability(): Promise<boolean>;
}

declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

export interface BeaconInfo {
  id: string;
  name: string;
  rssi: number;
  distance: number;
  lat?: number;
  lng?: number;
  floor?: number;
  venueName?: string;
  venueId?: string;
  zoneName?: string;
}

interface IndoorPosition {
  lat: number;
  lng: number;
  floor: number;
  accuracy: number;
  source: 'ble' | 'wifi' | 'hybrid' | 'simulated';
  venueName?: string;
  venueId?: string;
  beaconCount: number;
}

interface DatabaseBeacon {
  id: string;
  venue_id: string;
  beacon_uuid: string;
  major: number | null;
  minor: number | null;
  name: string;
  lat: number;
  lng: number;
  floor: number;
  tx_power: number;
  zone_name: string | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
  };
}

interface UseIndoorPositioningResult {
  isSupported: boolean;
  isBleSupported: boolean;
  isScanning: boolean;
  indoorPosition: IndoorPosition | null;
  nearbyBeacons: BeaconInfo[];
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  error: string | null;
  platformInfo: {
    platform: 'ios' | 'android' | 'web' | 'unknown';
    supportsWebBluetooth: boolean;
    supportsNativeBle: boolean;
    recommendation: string;
  };
}

// Calculate distance from RSSI using log-distance path loss model
function rssiToDistance(rssi: number, txPower: number = -59): number {
  if (rssi === 0) return -1;
  const ratio = rssi / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  }
  // Environmental factor (2-4, higher = more obstacles)
  const n = 2.5;
  return Math.pow(10, (txPower - rssi) / (10 * n));
}

// Trilateration to estimate position from multiple beacons
function trilateratePosition(beacons: BeaconInfo[]): { lat: number; lng: number; accuracy: number } | null {
  const validBeacons = beacons.filter(b => b.lat !== undefined && b.lng !== undefined && b.distance > 0);
  
  if (validBeacons.length < 1) return null;
  
  if (validBeacons.length === 1) {
    return {
      lat: validBeacons[0].lat!,
      lng: validBeacons[0].lng!,
      accuracy: validBeacons[0].distance + 10,
    };
  }
  
  // Weighted centroid based on inverse distance
  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;
  let minDistance = Infinity;
  
  validBeacons.forEach(beacon => {
    // Weight by inverse squared distance (closer beacons have much more influence)
    const weight = 1 / Math.pow(Math.max(beacon.distance, 0.1), 2);
    totalWeight += weight;
    weightedLat += beacon.lat! * weight;
    weightedLng += beacon.lng! * weight;
    minDistance = Math.min(minDistance, beacon.distance);
  });
  
  // Accuracy improves with more beacons
  const accuracyFactor = Math.max(1, 4 - validBeacons.length);
  
  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
    accuracy: Math.min(minDistance * accuracyFactor, 20),
  };
}

// Detect platform
function detectPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (typeof window !== 'undefined') return 'web';
  return 'unknown';
}

export function useIndoorPositioning(): UseIndoorPositioningResult {
  const [isScanning, setIsScanning] = useState(false);
  const [indoorPosition, setIndoorPosition] = useState<IndoorPosition | null>(null);
  const [nearbyBeacons, setNearbyBeacons] = useState<BeaconInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [databaseBeacons, setDatabaseBeacons] = useState<DatabaseBeacon[]>([]);
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  
  const platform = detectPlatform();
  const supportsWebBluetooth = typeof navigator !== 'undefined' && 
    'bluetooth' in navigator && 
    navigator.bluetooth !== undefined;
  
  // Native BLE would be available through Capacitor plugins
  const supportsNativeBle = typeof (window as any).Capacitor !== 'undefined';
  
  const isSupported = supportsWebBluetooth || supportsNativeBle;
  const isBleSupported = supportsWebBluetooth;

  // Get platform-specific recommendation
  const getRecommendation = (): string => {
    if (platform === 'ios') {
      if (supportsNativeBle) {
        return 'For best indoor positioning, ensure Bluetooth is enabled and the app has permission to use it.';
      }
      return 'Safari does not support Web Bluetooth. For indoor positioning on iOS, install the native app or use Chrome on Android.';
    }
    if (platform === 'android') {
      if (supportsWebBluetooth) {
        return 'Bluetooth is supported. Enable location and Bluetooth permissions for best results.';
      }
      return 'Use Chrome browser or install the native app for indoor positioning.';
    }
    if (supportsWebBluetooth) {
      return 'Web Bluetooth is supported. Grant permission when prompted to enable beacon scanning.';
    }
    return 'Your browser does not support Bluetooth. Use Chrome, Edge, or Opera for indoor positioning.';
  };

  const platformInfo = {
    platform,
    supportsWebBluetooth,
    supportsNativeBle,
    recommendation: getRecommendation(),
  };

  // Fetch beacons from database
  useEffect(() => {
    const fetchBeacons = async () => {
      const { data, error } = await supabase
        .from('venue_beacons')
        .select(`
          id,
          venue_id,
          beacon_uuid,
          major,
          minor,
          name,
          lat,
          lng,
          floor,
          tx_power,
          zone_name,
          venue:venues(id, name, address, lat, lng)
        `)
        .eq('is_active', true);
      
      if (!error && data) {
        setDatabaseBeacons(data as unknown as DatabaseBeacon[]);
      }
    };
    
    fetchBeacons();
  }, []);

  const processBeaconData = useCallback((detectedDevices: { id: string; rssi: number }[]) => {
    const beacons: BeaconInfo[] = [];
    
    detectedDevices.forEach(device => {
      // Find matching beacon in database
      const dbBeacon = databaseBeacons.find(b => 
        b.beacon_uuid.toLowerCase() === device.id.toLowerCase()
      );
      
      if (dbBeacon) {
        const distance = rssiToDistance(device.rssi, dbBeacon.tx_power);
        
        beacons.push({
          id: dbBeacon.id,
          name: dbBeacon.name,
          rssi: device.rssi,
          distance,
          lat: dbBeacon.lat,
          lng: dbBeacon.lng,
          floor: dbBeacon.floor,
          venueName: dbBeacon.venue?.name,
          venueId: dbBeacon.venue_id,
          zoneName: dbBeacon.zone_name || undefined,
        });
      }
    });
    
    // Sort by signal strength (closest first)
    beacons.sort((a, b) => b.rssi - a.rssi);
    setNearbyBeacons(beacons);
    
    // Calculate indoor position
    const position = trilateratePosition(beacons);
    if (position && beacons.length > 0) {
      const primaryBeacon = beacons[0];
      setIndoorPosition({
        lat: position.lat,
        lng: position.lng,
        floor: primaryBeacon.floor || 1,
        accuracy: position.accuracy,
        source: 'ble',
        venueName: primaryBeacon.venueName,
        venueId: primaryBeacon.venueId,
        beaconCount: beacons.length,
      });
    }
  }, [databaseBeacons]);

  const startScanning = useCallback(async () => {
    setError(null);
    
    // Check for native Capacitor BLE first
    if (supportsNativeBle && (window as any).Capacitor?.Plugins?.BleClient) {
      try {
        setIsScanning(true);
        const BleClient = (window as any).Capacitor.Plugins.BleClient;
        
        // Initialize BLE
        await BleClient.initialize();
        
        // Start scanning for beacons
        await BleClient.startScan({}, (result: any) => {
          const detectedDevices = [{
            id: result.device.deviceId,
            rssi: result.rssi || -70,
          }];
          processBeaconData(detectedDevices);
        });
        
        return;
      } catch (err) {
        console.error('Native BLE error:', err);
        setError('Failed to start native Bluetooth scanning');
        setIsScanning(false);
      }
    }
    
    // Fall back to Web Bluetooth
    if (!supportsWebBluetooth) {
      setError(platformInfo.recommendation);
      return;
    }

    try {
      setIsScanning(true);
      
      // Request Bluetooth device access
      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });
      
      bluetoothDeviceRef.current = device;
      
      // Note: Web Bluetooth has limitations for beacon scanning
      // It requires user interaction and doesn't support background scanning
      // For production, use native apps with Capacitor BLE plugin
      
      // Simulate beacon discovery based on the connected device
      scanIntervalRef.current = setInterval(() => {
        if (device) {
          // Match device ID against known beacons
          const simulatedRssi = -50 + Math.random() * 30;
          processBeaconData([{ id: device.id, rssi: simulatedRssi }]);
        }
      }, 2000);
      
    } catch (err) {
      console.error('Bluetooth scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start Bluetooth scanning');
      setIsScanning(false);
    }
  }, [supportsWebBluetooth, supportsNativeBle, processBeaconData, platformInfo.recommendation]);

  const stopScanning = useCallback(() => {
    // Stop native scanning if available
    if (supportsNativeBle && (window as any).Capacitor?.Plugins?.BleClient) {
      try {
        (window as any).Capacitor.Plugins.BleClient.stopScan();
      } catch (err) {
        console.error('Error stopping native scan:', err);
      }
    }
    
    // Clear web bluetooth interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Disconnect web bluetooth
    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
    }
    
    setIsScanning(false);
    setNearbyBeacons([]);
    setIndoorPosition(null);
  }, [supportsNativeBle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return {
    isSupported,
    isBleSupported,
    isScanning,
    indoorPosition,
    nearbyBeacons,
    startScanning,
    stopScanning,
    error,
    platformInfo,
  };
}
