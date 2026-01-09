import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Lock, User } from 'lucide-react';
import rallyLogo from '@/assets/rally-logo.png';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for pending rally code after auth
  useEffect(() => {
    if (user) {
      const pendingCode = sessionStorage.getItem('pendingRallyCode');
      if (pendingCode) {
        sessionStorage.removeItem('pendingRallyCode');
        navigate(`/join/${pendingCode}`);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("You're in! Let's rally.");
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, displayName);
      if (error) throw error;
      toast.success('Account created! Welcome to R@lly.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
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
      toast.error(error.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-rally-light relative overflow-hidden">
      {/* Orange header with just the white logo */}
      <div className="relative bg-primary pt-10 pb-16">
        {/* White R@lly logo - centered and larger */}
        <div 
          className={`flex flex-col items-center transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          <img 
            src={rallyLogo} 
            alt="R@lly" 
            className="w-48 h-48 object-contain filter brightness-0 invert drop-shadow-lg"
          />
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-8 relative z-10 -mt-8">
        <div 
          className={`w-full max-w-sm bg-rally-light rounded-t-3xl pt-8 transition-all duration-500 delay-150 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Form title */}
          <h2 className="text-2xl font-semibold text-rally-dark text-center mb-6 font-montserrat">
            {isSignUp ? 'Create Your Account' : 'Login To Your Account'}
          </h2>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {/* Name field - only for signup */}
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" strokeWidth={1.5} />
                <Input
                  type="text"
                  placeholder="Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-dark placeholder:text-rally-light-gray font-montserrat"
                  required
                />
              </div>
            )}

            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" strokeWidth={1.5} />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-dark placeholder:text-rally-light-gray font-montserrat"
                required
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" strokeWidth={1.5} />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-dark placeholder:text-rally-light-gray font-montserrat"
                minLength={6}
                required
              />
            </div>

            {/* Confirm Password - only for signup */}
            {isSignUp && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" strokeWidth={1.5} />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-dark placeholder:text-rally-light-gray font-montserrat"
                  minLength={6}
                  required
                />
              </div>
            )}

            {/* Forgot password - only for login */}
            {!isSignUp && (
              <div className="text-right">
                <button type="button" className="text-primary text-base font-montserrat hover:underline">
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <Button 
              type="submit" 
              className="w-full h-13 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-base font-montserrat mt-6"
              disabled={isLoading}
            >
              {isLoading 
                ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                : (isSignUp ? 'Sign Up' : 'Login')
              }
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-rally-gray"></div>
            <span className="px-4 text-rally-light-gray text-sm font-montserrat">or continue with</span>
            <div className="flex-1 border-t border-rally-gray"></div>
          </div>

          {/* Google Sign In */}
          <Button 
            type="button"
            variant="outline"
            className="w-full h-13 rounded-lg border-rally-gray font-medium text-base font-montserrat flex items-center justify-center gap-3"
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
        </div>
      </div>

      {/* Bottom toggle link */}
      <div className="py-8 text-center relative z-10">
        <p className="text-rally-light-gray text-base font-montserrat">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
