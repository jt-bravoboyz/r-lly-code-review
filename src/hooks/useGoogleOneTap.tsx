import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfiguration) => void;
          prompt: (callback?: (notification: PromptMomentNotification) => void) => void;
          cancel: () => void;
          revoke: (hint: string, callback: (response: RevocationResponse) => void) => void;
        };
      };
    };
  }
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  login_uri?: string;
  native_callback?: (response: CredentialResponse) => void;
  nonce?: string;
  prompt_parent_id?: string;
  state_cookie_domain?: string;
  ux_mode?: 'popup' | 'redirect';
}

interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
}

interface CredentialResponse {
  credential: string;
  select_by: string;
  clientId?: string;
}

interface PromptMomentNotification {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

interface RevocationResponse {
  successful: boolean;
  error?: string;
}

interface UseGoogleOneTapOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useGoogleOneTap(options?: UseGoogleOneTapOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Load the Google Identity Services script
  useEffect(() => {
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      setError(new Error('Failed to load Google Identity Services script'));
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup as it might be used elsewhere
    };
  }, [clientId]);

  // Handle the credential response from Google
  const handleCredentialResponse = useCallback(async (response: CredentialResponse) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Supabase's signInWithIdToken to authenticate
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (authError) {
        throw authError;
      }

      // Mark that user has an account
      localStorage.setItem('rally-has-account', 'true');
      
      options?.onSuccess?.();
    } catch (err: any) {
      const error = new Error(err?.message || 'Failed to sign in with Google');
      setError(error);
      options?.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isScriptLoaded || !clientId || initRef.current) return;
    if (!window.google?.accounts?.id) return;

    initRef.current = true;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      itp_support: true,
    });
  }, [isScriptLoaded, clientId, handleCredentialResponse]);

  // Render the Google Sign-In button
  const renderButton = useCallback((element: HTMLElement | null, config?: Partial<GoogleButtonConfiguration>) => {
    if (!element || !isScriptLoaded || !window.google?.accounts?.id) return;

    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: element.offsetWidth || 320,
      ...config,
    });
  }, [isScriptLoaded]);

  // Trigger the sign-in flow programmatically (for custom buttons)
  const signInWithGoogle = useCallback(async () => {
    if (!clientId) {
      const err = new Error('Google Client ID is not configured');
      setError(err);
      options?.onError?.(err);
      return;
    }

    if (!isScriptLoaded || !window.google?.accounts?.id) {
      const err = new Error('Google Identity Services is not loaded yet');
      setError(err);
      options?.onError?.(err);
      return;
    }

    // Trigger the One Tap prompt
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        // Fallback: if One Tap is not displayed, we need to use the button
        // This can happen if the user has blocked One Tap or is in incognito
        console.log('One Tap not displayed:', notification.getNotDisplayedReason());
      }
    });
  }, [clientId, isScriptLoaded, options]);

  return {
    signInWithGoogle,
    renderButton,
    isLoading,
    isScriptLoaded,
    error,
    isConfigured: !!clientId,
  };
}
