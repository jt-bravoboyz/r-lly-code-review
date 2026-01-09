import { useState, useEffect, useCallback, useRef } from 'react';

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
}

interface IndoorPosition {
  lat: number;
  lng: number;
  floor: number;
  accuracy: number;
  source: 'ble' | 'wifi' | 'hybrid';
  venueName?: string;
  beaconCount: number;
}

interface UseIndoorPositioningResult {
  isSupported: boolean;
  isScanning: boolean;
  indoorPosition: IndoorPosition | null;
  nearbyBeacons: BeaconInfo[];
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  error: string | null;
}

// Known venue beacons (in a real app, this would come from a database)
const KNOWN_VENUE_BEACONS: Record<string, { name: string; lat: number; lng: number; floor: number; venueName: string }> = {
  // Example beacon IDs - in production, these would be fetched from Supabase
  'beacon-bar-entrance': { name: 'Main Entrance', lat: 0, lng: 0, floor: 1, venueName: 'The Rally Bar' },
  'beacon-bar-stage': { name: 'Stage Area', lat: 0, lng: 0, floor: 1, venueName: 'The Rally Bar' },
  'beacon-bar-vip': { name: 'VIP Lounge', lat: 0, lng: 0, floor: 2, venueName: 'The Rally Bar' },
};

// Calculate distance from RSSI (simplified path loss model)
function rssiToDistance(rssi: number, txPower: number = -59): number {
  if (rssi === 0) return -1;
  const ratio = rssi / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  }
  return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
}

// Trilateration to estimate position from multiple beacons
function trilateratePosition(beacons: BeaconInfo[]): { lat: number; lng: number; accuracy: number } | null {
  const validBeacons = beacons.filter(b => b.lat !== undefined && b.lng !== undefined && b.distance > 0);
  
  if (validBeacons.length < 1) return null;
  
  if (validBeacons.length === 1) {
    // Single beacon - use its position with low accuracy
    return {
      lat: validBeacons[0].lat!,
      lng: validBeacons[0].lng!,
      accuracy: validBeacons[0].distance + 10,
    };
  }
  
  // Weighted average based on signal strength (closer = more weight)
  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;
  let minDistance = Infinity;
  
  validBeacons.forEach(beacon => {
    const weight = 1 / Math.max(beacon.distance, 0.1);
    totalWeight += weight;
    weightedLat += beacon.lat! * weight;
    weightedLng += beacon.lng! * weight;
    minDistance = Math.min(minDistance, beacon.distance);
  });
  
  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
    accuracy: Math.min(minDistance + 3, 15),
  };
}

export function useIndoorPositioning(): UseIndoorPositioningResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [indoorPosition, setIndoorPosition] = useState<IndoorPosition | null>(null);
  const [nearbyBeacons, setNearbyBeacons] = useState<BeaconInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);

  // Check for Web Bluetooth API support
  useEffect(() => {
    const supported = 'bluetooth' in navigator && navigator.bluetooth !== undefined;
    setIsSupported(supported);
    
    if (!supported) {
      console.log('Web Bluetooth API not supported in this browser');
    }
  }, []);

  const processBeaconData = useCallback((devices: BluetoothDevice[], rssiMap: Map<string, number>) => {
    const beacons: BeaconInfo[] = [];
    
    devices.forEach(device => {
      const rssi = rssiMap.get(device.id) || -80;
      const distance = rssiToDistance(rssi);
      const knownBeacon = KNOWN_VENUE_BEACONS[device.id];
      
      beacons.push({
        id: device.id,
        name: device.name || knownBeacon?.name || 'Unknown Beacon',
        rssi,
        distance,
        lat: knownBeacon?.lat,
        lng: knownBeacon?.lng,
        floor: knownBeacon?.floor,
        venueName: knownBeacon?.venueName,
      });
    });
    
    // Sort by signal strength (closest first)
    beacons.sort((a, b) => b.rssi - a.rssi);
    setNearbyBeacons(beacons);
    
    // Calculate indoor position if we have known beacons
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
        beaconCount: beacons.length,
      });
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      setError('Bluetooth not supported in this browser');
      return;
    }

    try {
      setError(null);
      setIsScanning(true);
      
      // Request Bluetooth device access
      // Note: Web Bluetooth requires user gesture and HTTPS
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });
      
      bluetoothDeviceRef.current = device;
      
      // Simulate beacon scanning (in production, you'd use actual BLE scanning)
      // Web Bluetooth API has limitations - real indoor positioning would use
      // native apps or specialized libraries
      
      // For demo purposes, we'll simulate beacon detection
      scanIntervalRef.current = setInterval(() => {
        // Simulate discovering beacons with varying RSSI
        const simulatedDevices: BluetoothDevice[] = [];
        const rssiMap = new Map<string, number>();
        
        // In a real implementation, this would come from actual BLE scanning
        // For now, we simulate based on the connected device
        if (device) {
          rssiMap.set(device.id, -50 + Math.random() * 20);
          simulatedDevices.push(device);
        }
        
        processBeaconData(simulatedDevices, rssiMap);
      }, 2000);
      
    } catch (err) {
      console.error('Bluetooth scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start Bluetooth scanning');
      setIsScanning(false);
    }
  }, [isSupported, processBeaconData]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
    }
    
    setIsScanning(false);
    setNearbyBeacons([]);
    setIndoorPosition(null);
  }, []);

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
    isScanning,
    indoorPosition,
    nearbyBeacons,
    startScanning,
    stopScanning,
    error,
  };
}
