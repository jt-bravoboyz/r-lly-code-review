import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useJoinEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Lock, ChevronRight, ArrowLeft, Fingerprint } from 'lucide-react';
import { z } from 'zod';
import { useGoogleOneTap } from '@/hooks/useGoogleOneTap';

const emailSchema = z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long');

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

type AuthMode = 'signin' | 'forgot-password';

export default function ReturningAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [showContent, setShowContent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rally-remember-me') === 'true';
  });
  
  const { signIn, user, profile } = useAuth();
  const { 
    isSupported: biometricSupported, 
    isRegistered: biometricRegistered, 
    isLoading: biometricLoading,
    authenticateWithBiometric,
    registerBiometric,
  } = useBiometricAuth();
  const joinEvent = useJoinEvent();
  const navigate = useNavigate();
  const autoJoinAttempted = useRef(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const handleGoogleSuccess = useCallback(() => {
    localStorage.setItem('rally-has-account', 'true');
    toast.success("Welcome back! Let's rally.");
  }, []);

  const handleGoogleError = useCallback((error: Error) => {
    toast.error(error.message || 'Failed to sign in with Google');
  }, []);

  const { 
    renderButton: renderGoogleButton, 
    isLoading: googleLoading,
    isScriptLoaded: googleScriptLoaded,
    isConfigured: googleConfigured,
  } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });
  
  const isForgotPassword = authMode === 'forgot-password';

  // Animate content in
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Pre-fill email if remembered
  useEffect(() => {
    if (rememberMe) {
      const savedEmail = localStorage.getItem('rally-remembered-email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [rememberMe]);

  // Auto-join rally after auth when there's a pending invite code
  useEffect(() => {
    const autoJoinRally = async () => {
      if (!user || !profile) return;
      if (autoJoinAttempted.current) return;
      
      const pendingCode = sessionStorage.getItem('pendingRallyCode');
      if (!pendingCode) {
        navigate('/');
        return;
      }
      
      autoJoinAttempted.current = true;
      sessionStorage.removeItem('pendingRallyCode');
      
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_event_preview_by_invite_code', { invite_code_param: pendingCode });
        
        if (rpcError || !rpcData || rpcData.length === 0) {
          toast.error('Rally not found');
          navigate('/');
          return;
        }
        
        const eventData = rpcData[0];
        
        const { data: existingAttendee } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', eventData.id)
          .eq('profile_id', profile.id)
          .maybeSingle();
        
        if (existingAttendee) {
          toast.info("You're already in this rally!");
          navigate(`/events/${eventData.id}`);
          return;
        }
        
        await joinEvent.mutateAsync({ eventId: eventData.id, profileId: profile.id });
        sessionStorage.setItem('showFirstTimeWelcome', eventData.id);
        toast.success("You're in! 🎉 Welcome to the rally!");
        navigate(`/events/${eventData.id}`);
      } catch (error: any) {
        console.error('Auto-join failed:', error);
        navigate('/');
      }
    };
    
    autoJoinRally();
  }, [user, profile, navigate, joinEvent]);

  const clearErrors = () => setErrors({});

  const getAuthErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please confirm your email before signing in. Check your inbox.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) throw error;
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rally-remember-me', 'true');
        localStorage.setItem('rally-remembered-email', email.trim());
      } else {
        localStorage.removeItem('rally-remember-me');
        localStorage.removeItem('rally-remembered-email');
      }
      
      localStorage.setItem('rally-has-account', 'true');
      toast.success("Welcome back! Let's rally.");
      
      // Offer biometric setup if supported and not already registered
      if (biometricSupported && !biometricRegistered && profile) {
        setTimeout(() => {
          if (confirm('Would you like to enable Face ID / Fingerprint login for faster access next time?')) {
            registerBiometric(profile.id, email.trim());
          }
        }, 1000);
      }
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const result = await authenticateWithBiometric();
    if (result && result.success) {
      setEmail(result.email);
      toast.success('Identity verified! Enter your password to continue.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setErrors({ email: result.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Render Google Sign-In button when script is loaded
  useEffect(() => {
    if (googleScriptLoaded && googleButtonRef.current && !isForgotPassword) {
      renderGoogleButton(googleButtonRef.current);
    }
  }, [googleScriptLoaded, renderGoogleButton, isForgotPassword]);

  if (user) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#121212" }}
    >
      {/* Radial gradient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(255, 106, 0, 0.12) 0%, rgba(255, 106, 0, 0.04) 50%, transparent 70%)",
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: "#FF6A00" }}
        />
        <div 
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: "#FF6A00" }}
        />
      </div>

      {/* Header with Logo */}
      <div className="pt-16 pb-8 px-8 text-center relative z-10">
        <h1
          className={`font-montserrat font-extrabold text-5xl tracking-tight transition-all duration-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ 
            color: "rgba(255, 255, 255, 0.95)",
            textShadow: "0 0 40px rgba(255, 106, 0, 0.3)",
          }}
        >
          R@LLY
        </h1>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 relative z-10">
        <div 
          className={`w-full max-w-sm transition-all duration-500 delay-100 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Welcome Back heading */}
          <h2 
            className="text-2xl font-bold text-center mb-2 font-montserrat"
            style={{ color: "rgba(255, 255, 255, 0.95)" }}
          >
            Welcome Back
          </h2>
          <p
            className="text-center mb-8 font-montserrat"
            style={{ color: "rgba(255, 255, 255, 0.6)" }}
          >
            {isForgotPassword ? 'Reset your password' : 'Sign in to continue'}
          </p>

          {/* Forgot Password Form */}
          {isForgotPassword ? (
            <div className="space-y-4">
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div 
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255, 106, 0, 0.2)" }}
                  >
                    <Mail className="w-8 h-8" style={{ color: "#FF6A00" }} />
                  </div>
                  <p 
                    className="font-montserrat"
                    style={{ color: "rgba(255, 255, 255, 0.8)" }}
                  >
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setResetEmailSent(false);
                      setEmail('');
                    }}
                    className="w-full h-14 rounded-xl font-bold text-lg font-montserrat"
                    style={{
                      background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
                      color: "#FFFFFF",
                      boxShadow: "0 8px 32px rgba(255, 106, 0, 0.35)",
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p 
                    className="text-sm font-montserrat mb-4 text-center"
                    style={{ color: "rgba(255, 255, 255, 0.7)" }}
                  >
                    Enter your email and we'll send you a reset link.
                  </p>
                  
                  <div className="relative">
                    <Mail 
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" 
                      strokeWidth={1.5}
                      style={{ color: "#FF6A00" }}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 rounded-xl font-montserrat text-base"
                      style={{
                        backgroundColor: "#1E1E1E",
                        borderColor: errors.email ? "#ef4444" : "rgba(255, 106, 0, 0.2)",
                        color: "rgba(255, 255, 255, 0.90)",
                      }}
                      required
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-xl font-bold text-lg font-montserrat group transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
                      color: "#FFFFFF",
                      boxShadow: "0 8px 32px rgba(255, 106, 0, 0.35)",
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                    <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="w-full flex items-center justify-center gap-2 text-base font-montserrat hover:underline mt-4"
                    style={{ color: "#FF6A00" }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Biometric Login - shown first if available */}
              {biometricSupported && biometricRegistered && (
                <div className="mb-6">
                  <Button 
                    type="button"
                    className="w-full h-16 rounded-xl font-bold text-lg font-montserrat flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
                      color: "#FFFFFF",
                      boxShadow: "0 8px 32px rgba(255, 106, 0, 0.35)",
                    }}
                    onClick={handleBiometricLogin}
                    disabled={isLoading || biometricLoading}
                  >
                    <Fingerprint className="h-6 w-6" />
                    {biometricLoading ? 'Verifying...' : 'Use Face ID / Fingerprint'}
                  </Button>
                  
                  <div className="flex items-center my-6">
                    <div className="flex-1 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}></div>
                    <span 
                      className="px-4 text-sm font-montserrat"
                      style={{ color: "rgba(255, 255, 255, 0.5)" }}
                    >
                      or sign in with email
                    </span>
                    <div className="flex-1 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}></div>
                  </div>
                </div>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Mail 
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" 
                    strokeWidth={1.5}
                    style={{ color: "#FF6A00" }}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 rounded-xl font-montserrat text-base"
                    style={{
                      backgroundColor: "#1E1E1E",
                      borderColor: errors.email ? "#ef4444" : "rgba(255, 106, 0, 0.2)",
                      color: "rgba(255, 255, 255, 0.90)",
                    }}
                    required
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="relative">
                  <Lock 
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" 
                    strokeWidth={1.5}
                    style={{ color: "#FF6A00" }}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 rounded-xl font-montserrat text-base"
                    style={{
                      backgroundColor: "#1E1E1E",
                      borderColor: errors.password ? "#ef4444" : "rgba(255, 106, 0, 0.2)",
                      color: "rgba(255, 255, 255, 0.90)",
                    }}
                    minLength={6}
                    required
                  />
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Remember me and Forgot password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="border-[rgba(255,106,0,0.4)] data-[state=checked]:bg-[#FF6A00] data-[state=checked]:border-[#FF6A00]"
                    />
                    <label 
                      htmlFor="remember-me" 
                      className="text-sm font-montserrat cursor-pointer"
                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Remember me
                    </label>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-sm font-montserrat hover:underline"
                    style={{ color: "#FF6A00" }}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit button */}
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl font-bold text-lg font-montserrat mt-2 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 8px 32px rgba(255, 106, 0, 0.35)",
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}></div>
                <span 
                  className="px-4 text-sm font-montserrat"
                  style={{ color: "rgba(255, 255, 255, 0.5)" }}
                >
                  or
                </span>
                <div className="flex-1 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}></div>
              </div>

              {/* Google Sign In - Native Google Button */}
              {googleConfigured && (
                <div 
                  ref={googleButtonRef}
                  className="w-full flex items-center justify-center min-h-[56px] rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom - New user link */}
      {!isForgotPassword && (
        <div className="py-8 text-center relative z-10">
          <p 
            className="text-base font-montserrat"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
          >
            New to R@lly?{" "}
            <button 
              onClick={() => {
                // Clear the account flag and reload to show signup flow
                localStorage.removeItem('rally-has-account');
                localStorage.removeItem('rally-onboarding-complete');
                window.location.href = '/';
              }}
              className="font-semibold hover:underline"
              style={{ color: "#FF6A00" }}
            >
              Create an account
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
