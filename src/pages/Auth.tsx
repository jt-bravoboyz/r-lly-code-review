import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useJoinEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Lock, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long');
const displayNameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  displayName: displayNameSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthMode = 'signin' | 'signup' | 'forgot-password';

export default function Auth() {
  // Check if user has an account (set after first successful signup/signin)
  // This is SEPARATE from onboarding completion - a user can complete onboarding
  // but not have an account yet (they need to sign up first)
  const hasAccount = localStorage.getItem('rally-has-account') === 'true';
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  // Users without an account default to signup, users with account default to signin
  const [authMode, setAuthMode] = useState<AuthMode>(hasAccount ? 'signin' : 'signup');
  const [showContent, setShowContent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, user, profile } = useAuth();
  const joinEvent = useJoinEvent();
  const navigate = useNavigate();
  const autoJoinAttempted = useRef(false);
  
  const isSignUp = authMode === 'signup';
  const isForgotPassword = authMode === 'forgot-password';

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-join rally after auth when there's a pending invite code
  useEffect(() => {
    const autoJoinRally = async () => {
      // Need both user and profile to join
      if (!user || !profile) return;
      
      // Prevent duplicate join attempts
      if (autoJoinAttempted.current) return;
      
      const pendingCode = sessionStorage.getItem('pendingRallyCode');
      if (!pendingCode) {
        navigate('/');
        return;
      }
      
      autoJoinAttempted.current = true;
      sessionStorage.removeItem('pendingRallyCode');
      
      try {
        // Fetch the event by invite code using the public function
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_event_preview_by_invite_code', { invite_code_param: pendingCode });
        
        if (rpcError || !rpcData || rpcData.length === 0) {
          toast.error('Rally not found');
          navigate('/');
          return;
        }
        
        const eventData = rpcData[0];
        
        // Check if already a member
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
        
        // Auto-join the rally
        await joinEvent.mutateAsync({ eventId: eventData.id, profileId: profile.id });
        
        // Set flag for first-time welcome dialog
        sessionStorage.setItem('showFirstTimeWelcome', eventData.id);
        
        toast.success("You're in! 🎉 Welcome to the rally!");
        navigate(`/events/${eventData.id}`);
      } catch (error: any) {
        console.error('Auto-join failed:', error);
        if (error.message?.includes('duplicate')) {
          // Already joined, just navigate
          const { data: rpcData } = await supabase
            .rpc('get_event_preview_by_invite_code', { invite_code_param: pendingCode });
          if (rpcData && rpcData.length > 0) {
            navigate(`/events/${rpcData[0].id}`);
          } else {
            navigate('/');
          }
        } else {
          toast.error('Failed to auto-join rally. Please try again.');
          navigate(`/join/${pendingCode}`);
        }
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
    if (message.includes('user already registered') || message.includes('already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (message.includes('signup disabled')) {
      return 'Sign ups are currently disabled. Please contact support.';
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

    // Validate inputs
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
      // Mark that user has an account for future visits
      localStorage.setItem('rally-has-account', 'true');
      toast.success("You're in! Let's rally.");
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Validate inputs
    const result = signUpSchema.safeParse({ email, password, confirmPassword, displayName });
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
      const { error } = await signUp(email.trim(), password, displayName.trim());
      if (error) throw error;
      // Mark that user has an account for future visits
      localStorage.setItem('rally-has-account', 'true');
      toast.success('Account created! Welcome to R@lly.');
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Validate email
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

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

      {/* Header with Logo and Tagline */}
      <div className="pt-12 pb-6 px-8 text-center relative z-10">
        {/* R@LLY Wordmark */}
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
        
        {/* Tagline */}
        <div 
          className={`flex items-center justify-center gap-2 mt-4 transition-all duration-500 delay-150 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.7)" }} className="font-montserrat text-lg">
            Ready.
          </span>
          <span style={{ color: "rgba(255, 255, 255, 0.7)" }} className="font-montserrat text-lg">
            Set.
          </span>
          <span 
            className="font-montserrat text-lg font-bold"
            style={{ 
              background: "linear-gradient(135deg, #FF6A00 0%, #FFB366 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            R@lly!
          </span>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-6 relative z-10">
        <div 
          className={`w-full max-w-sm transition-all duration-500 delay-200 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Form title */}
          <h2 
            className="text-xl font-semibold text-center mb-6 font-montserrat"
            style={{ color: "rgba(255, 255, 255, 0.90)" }}
          >
            {isForgotPassword 
              ? 'Reset Password' 
              : isSignUp 
                ? (!hasAccount ? 'Welcome' : 'Create Your Account')
                : 'Welcome Back'
            }
          </h2>

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
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Check your inbox and follow the instructions.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setResetEmailSent(false);
                      setEmail('');
                    }}
                    className="w-full h-14 rounded-xl font-bold text-lg font-montserrat group transition-all duration-300 hover:scale-[1.02]"
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
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  
                  {/* Email field */}
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
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                    <ChevronRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  {/* Back to sign in */}
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
              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                {/* Name field - only for signup */}
                {isSignUp && (
                  <div className="relative">
                    <User 
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" 
                      strokeWidth={1.5} 
                      style={{ color: "#FF6A00" }}
                    />
                    <Input
                      type="text"
                      placeholder="Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-12 h-14 rounded-xl font-montserrat text-base"
                      style={{
                        backgroundColor: "#1E1E1E",
                        borderColor: "rgba(255, 106, 0, 0.2)",
                        color: "rgba(255, 255, 255, 0.90)",
                      }}
                      required
                    />
                  </div>
                )}

                {/* Email field */}
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
                      borderColor: "rgba(255, 106, 0, 0.2)",
                      color: "rgba(255, 255, 255, 0.90)",
                    }}
                    required
                  />
                </div>

                {/* Password field */}
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
                      borderColor: "rgba(255, 106, 0, 0.2)",
                      color: "rgba(255, 255, 255, 0.90)",
                    }}
                    minLength={6}
                    required
                  />
                </div>

                {/* Confirm Password - only for signup */}
                {isSignUp && (
                  <div className="relative">
                    <Lock 
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" 
                      strokeWidth={1.5}
                      style={{ color: "#FF6A00" }}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 h-14 rounded-xl font-montserrat text-base"
                      style={{
                        backgroundColor: "#1E1E1E",
                        borderColor: "rgba(255, 106, 0, 0.2)",
                        color: "rgba(255, 255, 255, 0.90)",
                      }}
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {/* Forgot password - only for login */}
                {!isSignUp && (
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('forgot-password')}
                      className="text-base font-montserrat hover:underline"
                      style={{ color: "#FF6A00" }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

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
                  {isLoading 
                    ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                    : (isSignUp ? 'Sign Up' : 'Login')
                  }
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
                  or continue with
                </span>
                <div className="flex-1 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}></div>
              </div>

              {/* Google Sign In */}
              <Button 
                type="button"
                variant="outline"
                className="w-full h-14 rounded-xl font-medium text-base font-montserrat flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "rgba(255, 255, 255, 0.90)",
                }}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bottom links */}
      {!isForgotPassword && (
        <div className="py-8 text-center relative z-10 space-y-3">
          {/* For new users in signup mode, don't show the toggle to signin */}
          {/* For users with accounts or those who switched modes, show the toggle */}
          {!(!hasAccount && isSignUp) && (
            <p 
              className="text-base font-montserrat"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button 
                onClick={() => setAuthMode(isSignUp ? 'signin' : 'signup')}
                className="font-semibold hover:underline"
                style={{ color: "#FF6A00" }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          )}
          
          {/* For new users who somehow got to signin, let them go back to signup */}
          {!hasAccount && !isSignUp && (
            <p 
              className="text-base font-montserrat"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              New here?{" "}
              <button 
                onClick={() => setAuthMode('signup')}
                className="font-semibold hover:underline"
                style={{ color: "#FF6A00" }}
              >
                Create an account
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/settings-preview')}
            className="text-sm underline text-primary"
          >
            View settings preview (no login)
          </button>
        </div>
      )}
    </div>
  );
}
