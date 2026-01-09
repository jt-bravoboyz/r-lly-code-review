import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className={`min-h-screen flex flex-col ${isSignUp ? 'bg-rally-light' : 'bg-rally-light'} relative overflow-hidden`}>
      {/* Orange header wave - matching Figma */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-primary">
        {/* Decorative pills in header */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 left-4" />
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-52 left-20" />
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-32 left-36" />
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 left-52" />
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-56 left-68" />
          <div className="absolute w-12 h-80 bg-white/5 rounded-3xl -top-40 right-4" />
        </div>
      </div>

      {/* Logo section in header */}
      <div className="relative z-10 flex flex-col items-center pt-24 pb-8">
        <div 
          className={`transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          {/* Cream circle with logo */}
          <div className="w-20 h-20 rounded-full bg-rally-cream flex items-center justify-center shadow-lg mb-3">
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">R@LLY</h1>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-8 relative z-10">
        <div 
          className={`w-full max-w-sm transition-all duration-500 delay-150 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
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
                  className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-gray placeholder:text-rally-light-gray font-montserrat"
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
                className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-gray placeholder:text-rally-light-gray font-montserrat"
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
                className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-gray placeholder:text-rally-light-gray font-montserrat"
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
                  className="pl-12 h-13 rounded-md border-rally-gray bg-transparent text-rally-gray placeholder:text-rally-light-gray font-montserrat"
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
