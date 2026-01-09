import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

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
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  
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
  const [bleInitialized, setBleInitialized] = useState(false);
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectedDevicesRef = useRef<Map<string, { rssi: number; timestamp: number }>>(new Map());
  
  const platform = detectPlatform();
  const isNativePlatform = Capacitor.isNativePlatform();
  
  const supportsWebBluetooth = typeof navigator !== 'undefined' && 
    'bluetooth' in navigator && 
    navigator.bluetooth !== undefined;
  
  // Native BLE is available through Capacitor on iOS/Android
  const supportsNativeBle = isNativePlatform;
  
  const isSupported = supportsWebBluetooth || supportsNativeBle;
  const isBleSupported = supportsWebBluetooth || supportsNativeBle;

  // Get platform-specific recommendation
  const getRecommendation = (): string => {
    if (platform === 'ios') {
      if (supportsNativeBle) {
        return 'For best indoor positioning, ensure Bluetooth is enabled and the app has permission to use it.';
      }
      return 'Safari does not support Web Bluetooth. For indoor positioning on iOS, install the native app.';
    }
    if (platform === 'android') {
      if (supportsNativeBle) {
        return 'Enable Bluetooth and location permissions for best indoor positioning results.';
      }
      if (supportsWebBluetooth) {
        return 'Bluetooth is supported. Enable location and Bluetooth permissions for best results.';
      }
      return 'Install the native app for indoor positioning support.';
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

  // Initialize BLE on native platforms
  useEffect(() => {
    const initBle = async () => {
      if (supportsNativeBle && !bleInitialized) {
        try {
          await BleClient.initialize({ androidNeverForLocation: false });
          setBleInitialized(true);
          console.log('BLE initialized successfully');
        } catch (err) {
          console.error('Failed to initialize BLE:', err);
          setError('Failed to initialize Bluetooth');
        }
      }
    };
    
    initBle();
  }, [supportsNativeBle, bleInitialized]);

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

  const processBeaconData = useCallback((detectedDevices: { id: string; rssi: number; name?: string }[]) => {
    const beacons: BeaconInfo[] = [];
    const now = Date.now();
    
    // Update detected devices map with timestamps
    detectedDevices.forEach(device => {
      detectedDevicesRef.current.set(device.id.toLowerCase(), {
        rssi: device.rssi,
        timestamp: now,
      });
    });
    
    // Remove stale devices (older than 10 seconds)
    detectedDevicesRef.current.forEach((value, key) => {
      if (now - value.timestamp > 10000) {
        detectedDevicesRef.current.delete(key);
      }
    });
    
    // Match detected devices with database beacons
    detectedDevicesRef.current.forEach((deviceInfo, deviceId) => {
      // Find matching beacon in database by UUID
      const dbBeacon = databaseBeacons.find(b => 
        b.beacon_uuid.toLowerCase() === deviceId ||
        b.beacon_uuid.toLowerCase().replace(/-/g, '') === deviceId.replace(/-/g, '')
      );
      
      if (dbBeacon) {
        const distance = rssiToDistance(deviceInfo.rssi, dbBeacon.tx_power);
        
        beacons.push({
          id: dbBeacon.id,
          name: dbBeacon.name,
          rssi: deviceInfo.rssi,
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

  const startNativeScanning = useCallback(async () => {
    if (!bleInitialized) {
      try {
        await BleClient.initialize({ androidNeverForLocation: false });
        setBleInitialized(true);
      } catch (err) {
        throw new Error('Failed to initialize Bluetooth');
      }
    }

    // Request permissions on Android
    if (platform === 'android') {
      try {
        await BleClient.requestLEScan(
          { allowDuplicates: true },
          (result: ScanResult) => {
            const deviceId = result.device.deviceId;
            const rssi = result.rssi ?? -100;
            const name = result.device.name ?? result.localName;
            
            processBeaconData([{ id: deviceId, rssi, name: name ?? undefined }]);
          }
        );
      } catch (err: any) {
        if (err.message?.includes('denied')) {
          throw new Error('Bluetooth permission denied. Please enable Bluetooth permissions in settings.');
        }
        throw err;
      }
    } else if (platform === 'ios') {
      // iOS BLE scanning
      try {
        await BleClient.requestLEScan(
          { allowDuplicates: true },
          (result: ScanResult) => {
            const deviceId = result.device.deviceId;
            const rssi = result.rssi ?? -100;
            const name = result.device.name ?? result.localName;
            
            processBeaconData([{ id: deviceId, rssi, name: name ?? undefined }]);
          }
        );
      } catch (err: any) {
        if (err.message?.includes('denied') || err.message?.includes('unauthorized')) {
          throw new Error('Bluetooth permission denied. Please enable Bluetooth in Settings.');
        }
        throw err;
      }
    }
  }, [bleInitialized, platform, processBeaconData]);

  const startWebBluetoothScanning = useCallback(async () => {
    if (!supportsWebBluetooth || !navigator.bluetooth) {
      throw new Error(platformInfo.recommendation);
    }

    // Web Bluetooth requires user interaction and has limitations
    // It's mainly for connecting to specific devices, not for beacon scanning
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service', 'device_information'],
    });
    
    // Simulate beacon discovery based on the connected device
    // Note: Real beacon scanning isn't possible with Web Bluetooth
    scanIntervalRef.current = setInterval(() => {
      if (device) {
        const simulatedRssi = -50 + Math.random() * 30;
        processBeaconData([{ id: device.id, rssi: simulatedRssi, name: device.name }]);
      }
    }, 2000);
  }, [supportsWebBluetooth, processBeaconData, platformInfo.recommendation]);

  const startScanning = useCallback(async () => {
    setError(null);
    
    try {
      setIsScanning(true);
      
      // Use native BLE on iOS/Android
      if (supportsNativeBle) {
        await startNativeScanning();
      } else if (supportsWebBluetooth) {
        await startWebBluetoothScanning();
      } else {
        throw new Error(platformInfo.recommendation);
      }
    } catch (err) {
      console.error('Bluetooth scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start Bluetooth scanning');
      setIsScanning(false);
    }
  }, [supportsNativeBle, supportsWebBluetooth, startNativeScanning, startWebBluetoothScanning, platformInfo.recommendation]);

  const stopScanning = useCallback(async () => {
    // Stop native scanning
    if (supportsNativeBle && bleInitialized) {
      try {
        await BleClient.stopLEScan();
      } catch (err) {
        console.error('Error stopping native scan:', err);
      }
    }
    
    // Clear web bluetooth interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Clear detected devices
    detectedDevicesRef.current.clear();
    
    setIsScanning(false);
    setNearbyBeacons([]);
    setIndoorPosition(null);
  }, [supportsNativeBle, bleInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (supportsNativeBle && bleInitialized) {
        BleClient.stopLEScan().catch(() => {});
      }
    };
  }, [supportsNativeBle, bleInitialized]);

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
