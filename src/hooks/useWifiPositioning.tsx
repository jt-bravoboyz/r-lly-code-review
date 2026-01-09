import { useState, useEffect, useCallback, useRef } from 'react';

export interface WifiPositionInfo {
  lat: number;
  lng: number;
  accuracy: number;
  source: 'wifi' | 'network';
  confidence: 'high' | 'medium' | 'low';
  networkInfo?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

export interface EnvironmentInfo {
  isIndoor: boolean;
  confidence: number;
  indicators: {
    gpsAccuracy: 'good' | 'poor' | 'unknown';
    signalStability: 'stable' | 'fluctuating' | 'unknown';
    altitudeChange: 'minimal' | 'significant' | 'unknown';
  };
  recommendation: string;
}

interface UseWifiPositioningResult {
  isSupported: boolean;
  wifiPosition: WifiPositionInfo | null;
  environmentInfo: EnvironmentInfo;
  isScanning: boolean;
  startScanning: (gpsAccuracy?: number) => void;
  stopScanning: () => void;
  updateFromGps: (lat: number, lng: number, accuracy: number, altitude?: number | null) => void;
}

// Detect if we're likely indoors based on GPS accuracy patterns
function detectIndoorEnvironment(
  accuracyHistory: number[],
  currentAccuracy: number,
  altitudeHistory: (number | null)[]
): EnvironmentInfo {
  // Analyze GPS accuracy
  const avgAccuracy = accuracyHistory.length > 0 
    ? accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length 
    : currentAccuracy;
  
  const gpsAccuracy: 'good' | 'poor' | 'unknown' = 
    avgAccuracy < 10 ? 'good' : 
    avgAccuracy > 30 ? 'poor' : 'unknown';
  
  // Analyze signal stability (standard deviation)
  let signalStability: 'stable' | 'fluctuating' | 'unknown' = 'unknown';
  if (accuracyHistory.length >= 3) {
    const variance = accuracyHistory.reduce((sum, val) => 
      sum + Math.pow(val - avgAccuracy, 2), 0) / accuracyHistory.length;
    const stdDev = Math.sqrt(variance);
    signalStability = stdDev < 5 ? 'stable' : 'fluctuating';
  }
  
  // Analyze altitude changes (if available)
  let altitudeChange: 'minimal' | 'significant' | 'unknown' = 'unknown';
  const validAltitudes = altitudeHistory.filter((a): a is number => a !== null);
  if (validAltitudes.length >= 2) {
    const altVariance = validAltitudes.reduce((sum, val, _, arr) => 
      sum + Math.pow(val - arr[0], 2), 0) / validAltitudes.length;
    altitudeChange = altVariance < 4 ? 'minimal' : 'significant';
  }
  
  // Calculate indoor probability
  let indoorScore = 0;
  
  // Poor GPS suggests indoor
  if (gpsAccuracy === 'poor') indoorScore += 40;
  else if (gpsAccuracy === 'unknown') indoorScore += 20;
  
  // Fluctuating signal suggests indoor
  if (signalStability === 'fluctuating') indoorScore += 30;
  
  // Significant altitude changes with poor GPS suggests multi-floor indoor
  if (altitudeChange === 'significant' && gpsAccuracy === 'poor') indoorScore += 20;
  
  // Very high accuracy (< 5m) almost always means outdoor with clear sky
  if (currentAccuracy < 5) indoorScore = Math.max(0, indoorScore - 30);
  
  const isIndoor = indoorScore >= 50;
  const confidence = Math.min(100, Math.max(0, indoorScore)) / 100;
  
  let recommendation = '';
  if (isIndoor && confidence > 0.7) {
    recommendation = 'You appear to be indoors. GPS accuracy may be limited.';
  } else if (isIndoor) {
    recommendation = 'Location accuracy may be reduced in this area.';
  } else if (gpsAccuracy === 'good') {
    recommendation = 'Excellent GPS signal. Location is highly accurate.';
  } else {
    recommendation = 'GPS signal is good.';
  }
  
  return {
    isIndoor,
    confidence,
    indicators: {
      gpsAccuracy,
      signalStability,
      altitudeChange,
    },
    recommendation,
  };
}

export function useWifiPositioning(): UseWifiPositioningResult {
  const [wifiPosition, setWifiPosition] = useState<WifiPositionInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isIndoor: false,
    confidence: 0,
    indicators: {
      gpsAccuracy: 'unknown',
      signalStability: 'unknown',
      altitudeChange: 'unknown',
    },
    recommendation: 'Waiting for location data...',
  });
  
  const accuracyHistoryRef = useRef<number[]>([]);
  const altitudeHistoryRef = useRef<(number | null)[]>([]);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if Network Information API is supported
  const isSupported = typeof navigator !== 'undefined' && 
    ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator);
  
  // Get network information for additional context
  const getNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
      (navigator as any).mozConnection || 
      (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
        downlink: connection.downlink, // Mbps
        rtt: connection.rtt, // Round-trip time in ms
      };
    }
    return undefined;
  }, []);
  
  // Update environment detection with new GPS data
  const updateFromGps = useCallback((lat: number, lng: number, accuracy: number, altitude?: number | null) => {
    // Keep last 10 readings
    accuracyHistoryRef.current = [...accuracyHistoryRef.current.slice(-9), accuracy];
    altitudeHistoryRef.current = [...altitudeHistoryRef.current.slice(-9), altitude ?? null];
    lastPositionRef.current = { lat, lng };
    
    const newEnvInfo = detectIndoorEnvironment(
      accuracyHistoryRef.current,
      accuracy,
      altitudeHistoryRef.current
    );
    
    setEnvironmentInfo(newEnvInfo);
    
    // If we detect we're indoors and GPS accuracy is poor, 
    // use network-enhanced position estimation
    if (newEnvInfo.isIndoor && accuracy > 30) {
      const networkInfo = getNetworkInfo();
      
      // Network-based position is essentially the last known good GPS
      // with adjusted accuracy based on network conditions
      let adjustedAccuracy = accuracy;
      let confidence: 'high' | 'medium' | 'low' = 'low';
      
      if (networkInfo) {
        // Better network = potentially better indoor positioning services
        if (networkInfo.effectiveType === '4g' && networkInfo.rtt && networkInfo.rtt < 100) {
          adjustedAccuracy = Math.min(accuracy, 50); // Cap at 50m for good network
          confidence = 'medium';
        } else if (networkInfo.effectiveType === '4g') {
          confidence = 'medium';
        }
      }
      
      setWifiPosition({
        lat,
        lng,
        accuracy: adjustedAccuracy,
        source: 'network',
        confidence,
        networkInfo,
      });
    } else if (!newEnvInfo.isIndoor) {
      // Outdoors - clear wifi position to prefer GPS
      setWifiPosition(null);
    }
  }, [getNetworkInfo]);
  
  const startScanning = useCallback((gpsAccuracy?: number) => {
    setIsScanning(true);
    
    // Monitor network changes
    const connection = (navigator as any).connection || 
      (navigator as any).mozConnection || 
      (navigator as any).webkitConnection;
    
    if (connection) {
      const handleChange = () => {
        const networkInfo = getNetworkInfo();
        // Update position with network info if we have a last known position
        if (lastPositionRef.current && wifiPosition) {
          setWifiPosition(prev => prev ? { ...prev, networkInfo } : null);
        }
      };
      
      connection.addEventListener?.('change', handleChange);
    }
    
    // Initial assessment if GPS accuracy provided
    if (gpsAccuracy !== undefined) {
      accuracyHistoryRef.current = [gpsAccuracy];
      setEnvironmentInfo(detectIndoorEnvironment([gpsAccuracy], gpsAccuracy, []));
    }
  }, [getNetworkInfo, wifiPosition]);
  
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Clear history
    accuracyHistoryRef.current = [];
    altitudeHistoryRef.current = [];
    setWifiPosition(null);
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
    wifiPosition,
    environmentInfo,
    isScanning,
    startScanning,
    stopScanning,
    updateFromGps,
  };
}
