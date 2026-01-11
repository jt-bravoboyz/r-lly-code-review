import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simple encoding utilities
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

interface BiometricCredential {
  credentialId: string;
  publicKey: string;
  userId: string;
  userEmail: string;
}

export function useBiometricAuth() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if WebAuthn is supported
  useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } catch {
          setIsSupported(false);
        }
      }
    };
    checkSupport();
  }, []);

  // Check if user has registered biometrics
  useEffect(() => {
    const stored = localStorage.getItem('rally-biometric-credential');
    setIsRegistered(!!stored);
  }, []);

  // Register biometric credential
  const registerBiometric = useCallback(async (userId: string, userEmail: string) => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return false;
    }

    setIsLoading(true);
    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'R@lly',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: userEmail.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Store credential locally (in production, you'd store this on the server)
      const credentialData: BiometricCredential = {
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey() || new ArrayBuffer(0)),
        userId,
        userEmail,
      };

      localStorage.setItem('rally-biometric-credential', JSON.stringify(credentialData));
      setIsRegistered(true);
      toast.success('Biometric login enabled! 🎉');
      return true;
    } catch (error: any) {
      console.error('Biometric registration failed:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric registration was cancelled');
      } else {
        toast.error('Failed to setup biometric login');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Authenticate with biometrics
  const authenticateWithBiometric = useCallback(async (): Promise<{ email: string; success: boolean } | null> => {
    const storedData = localStorage.getItem('rally-biometric-credential');
    if (!storedData) {
      toast.error('No biometric credential found. Please login with email first.');
      return null;
    }

    setIsLoading(true);
    try {
      const credential: BiometricCredential = JSON.parse(storedData);
      
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: base64ToBuffer(credential.credentialId),
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // In a full implementation, you'd verify the assertion on the server
      // For now, we trust the local verification and return the stored credentials
      return { email: credential.userEmail, success: true };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else {
        toast.error('Biometric authentication failed');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove biometric credential
  const removeBiometric = useCallback(() => {
    localStorage.removeItem('rally-biometric-credential');
    setIsRegistered(false);
    toast.success('Biometric login disabled');
  }, []);

  return {
    isSupported,
    isRegistered,
    isLoading,
    registerBiometric,
    authenticateWithBiometric,
    removeBiometric,
  };
}
