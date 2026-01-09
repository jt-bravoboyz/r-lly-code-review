import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

interface NativeCompassResult {
  heading: number | null;
  accuracy: 'high' | 'medium' | 'low' | 'unknown';
  isNative: boolean;
  isSupported: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
}

// Smoothing factor for compass jitter reduction (0-1, lower = more smoothing)
const COMPASS_SMOOTHING = 0.15;

// Smooth angle values (handles wrap-around at 360)
function smoothAngle(current: number, target: number, factor: number): number {
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (current + diff * factor + 360) % 360;
}

export function useNativeCompass(): NativeCompassResult {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low' | 'unknown'>('unknown');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const smoothedHeadingRef = useRef<number>(0);
  const isNative = Capacitor.isNativePlatform();
  const listenerRef = useRef<any>(null);

  // Request motion permissions (required for iOS)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (isNative) {
        // Native Capacitor - request motion permissions
        // On iOS, this will trigger the permission dialog
        // On Android, motion sensors don't require runtime permissions
        setIsSupported(true);
        return true;
      } else {
        // Web fallback - request DeviceOrientation permission (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          const granted = permission === 'granted';
          setIsSupported(granted);
          return granted;
        } else {
          // No permission required (Android/older iOS)
          setIsSupported(true);
          return true;
        }
      }
    } catch (err) {
      setError('Failed to request motion permissions');
      console.error('Motion permission error:', err);
      return false;
    }
  }, [isNative]);

  // Start listening to compass/orientation
  useEffect(() => {
    let isMounted = true;

    const startListening = async () => {
      if (isNative) {
        // Use Capacitor Motion plugin for native compass
        try {
          listenerRef.current = await Motion.addListener('orientation', (event) => {
            if (!isMounted) return;
            
            // Capacitor Motion provides alpha, beta, gamma
            // alpha is the compass heading (0-360)
            let newHeading: number | null = null;
            
            if (event.alpha !== undefined && event.alpha !== null) {
              // On Android, alpha is the rotation around the z-axis (0-360)
              // We need to invert it for compass heading
              newHeading = (360 - event.alpha) % 360;
            }
            
            if (newHeading !== null) {
              smoothedHeadingRef.current = smoothAngle(
                smoothedHeadingRef.current,
                newHeading,
                COMPASS_SMOOTHING
              );
              setHeading(Math.round(smoothedHeadingRef.current));
              
              // Native sensors typically have high accuracy
              setAccuracy('high');
            }
          });
          
          setIsSupported(true);
          setError(null);
        } catch (err) {
          console.error('Failed to start native motion listener:', err);
          setError('Native motion not available');
          setIsSupported(false);
          
          // Fallback to web API
          startWebFallback();
        }
      } else {
        // Web fallback
        startWebFallback();
      }
    };

    const startWebFallback = () => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        if (!isMounted) return;
        
        let newHeading: number | null = null;
        
        // iOS uses webkitCompassHeading (true north)
        if ('webkitCompassHeading' in event) {
          newHeading = (event as any).webkitCompassHeading;
          setAccuracy('high'); // iOS compass heading is calibrated
        } else if (event.alpha !== null) {
          // Android uses alpha (magnetic north, 0 = north)
          newHeading = (360 - event.alpha) % 360;
          
          // Estimate accuracy based on whether we have absolute orientation
          if (event.absolute) {
            setAccuracy('high');
          } else {
            setAccuracy('medium');
          }
        }
        
        if (newHeading !== null) {
          smoothedHeadingRef.current = smoothAngle(
            smoothedHeadingRef.current,
            newHeading,
            COMPASS_SMOOTHING
          );
          setHeading(Math.round(smoothedHeadingRef.current));
        }
      };

      // Request permission for iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
              setIsSupported(true);
            } else {
              setError('Motion permission denied');
              setIsSupported(false);
            }
          })
          .catch((err: any) => {
            console.error('Permission error:', err);
            setError('Failed to request motion permission');
          });
      } else {
        // No permission required
        window.addEventListener('deviceorientation', handleOrientation, true);
        setIsSupported(true);
      }

      // Cleanup function
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    };

    startListening();

    return () => {
      isMounted = false;
      
      // Clean up native listener
      if (listenerRef.current && isNative) {
        listenerRef.current.remove();
      }
      
      // Clean up web listener
      window.removeEventListener('deviceorientation', () => {}, true);
    };
  }, [isNative]);

  return {
    heading,
    accuracy,
    isNative,
    isSupported,
    error,
    requestPermission,
  };
}
