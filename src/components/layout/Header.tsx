import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { User, Moon } from 'lucide-react';
import rallyLogo from '@/assets/rally-logo.png';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  icon?: React.ReactNode;
  afterRallyMode?: boolean;
}

export function Header({ title, icon, afterRallyMode }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className={`sticky top-0 z-40 shadow-lg ${
      afterRallyMode 
        ? 'bg-gradient-to-r from-[hsl(270,60%,25%)] via-[hsl(270,55%,30%)] to-[hsl(280,60%,28%)] shadow-purple-500/20' 
        : 'bg-gradient-to-r from-primary via-primary to-orange-500 shadow-primary/20'
    }`}>
      <div className="h-6" />
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="relative">
          <div className={`absolute inset-0 rounded-full blur-sm ${afterRallyMode ? 'bg-purple-300/30' : 'bg-white/30'}`} />
          <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
        </Link>
        
        {/* After R@lly Badge - shows in center when in After R@lly mode */}
        {afterRallyMode ? (
          <Badge className="bg-purple-600/80 text-white border-purple-400/50 px-3 py-1.5 text-sm font-semibold shadow-lg">
            <Moon className="h-4 w-4 mr-1.5" />
            After R@lly
          </Badge>
        ) : title ? (
          <h1 className="text-xl font-bold text-white font-montserrat drop-shadow-sm flex items-center gap-2">
            {icon || <User className="h-5 w-5" strokeWidth={2.5} />}
            {title}
          </h1>
        ) : null}
        
        <Link to="/profile" className="relative group">
          <div className={`absolute inset-0 rounded-full blur-sm scale-110 ${afterRallyMode ? 'bg-purple-300/30' : 'bg-white/30'}`} />
          <Avatar className={`h-11 w-11 ring-2 hover:ring-white transition-all relative shadow-lg ${
            afterRallyMode ? 'ring-purple-300/50' : 'ring-white/50'
          }`}>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className={`text-sm font-bold ${
              afterRallyMode ? 'bg-purple-200 text-purple-800' : 'bg-white text-primary'
            }`}>
              {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
