import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
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

  if (user) {
    navigate('/');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success("You're in! Let's rally.");
      navigate('/');
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
      await signUp(email, password, displayName);
      toast.success('Account created! Welcome to R@lly.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-rally-light relative overflow-hidden">
      {/* Orange header with just the white logo */}
      <div className="relative bg-primary pt-12 pb-20">
        {/* White R@lly logo - centered and larger */}
        <div 
          className={`flex flex-col items-center transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          <img 
            src={rallyLogo} 
            alt="R@lly" 
            className="w-32 h-32 object-contain filter brightness-0 invert drop-shadow-lg"
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
