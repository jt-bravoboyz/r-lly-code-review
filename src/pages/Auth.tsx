import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import rallyLogo from '@/assets/rally-logo.png';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
    <div className="min-h-screen flex flex-col p-4 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] gradient-radial opacity-40" />
        <div className="absolute top-16 left-8 w-2 h-2 rounded-full bg-primary/30 float-animation" />
        <div className="absolute top-32 right-12 w-3 h-3 rounded-full bg-primary/20 float-animation-delayed" />
      </div>

      <Link 
        to="/" 
        className={`flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all z-10 ${showContent ? 'opacity-100' : 'opacity-0'}`}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full relative z-10">
        {/* Logo */}
        <div 
          className={`text-center mb-8 transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          <div className="relative inline-block">
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-24 h-24 mx-auto object-contain"
            />
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-primary/15 blur-xl -z-10" />
          </div>
          <p className="text-muted-foreground mt-3 font-medium">Join your crew</p>
        </div>

        <Card 
          className={`w-full card-rally transition-all duration-500 delay-150 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <Tabs defaultValue="signin" className="w-full">
            <CardContent className="pt-6 pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-muted h-12 rounded-xl p-1">
                <TabsTrigger 
                  value="signin" 
                  className="font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </CardContent>
            
            <CardContent className="pt-6">
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-rally h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signin" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password-signin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-rally h-12"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-rally h-12 text-base mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : "Let's Go"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup" className="text-sm font-medium">Name</Label>
                    <Input
                      id="name-signup"
                      type="text"
                      placeholder="What should we call you?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-rally h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-rally h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-rally h-12"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full btn-rally h-12 text-base mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Join the Rally'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
