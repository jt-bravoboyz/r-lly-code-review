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
    <header className={`sticky top-0 z-40 ${
      afterRallyMode 
        ? 'bg-gradient-to-r from-[hsl(270,60%,15%/0.85)] via-[hsl(270,55%,18%/0.85)] to-[hsl(280,60%,16%/0.85)] shadow-[0_4px_30px_hsl(270,60%,30%/0.2)]' 
        : 'bg-gradient-to-r from-primary/90 via-primary/85 to-orange-500/90 shadow-[0_4px_30px_hsl(22,90%,52%/0.2)]'
    } backdrop-blur-xl border-b border-white/[0.12]`} style={{ WebkitBackdropFilter: 'blur(20px)' }}>
      <div style={{ height: 'env(safe-area-inset-top, 1.5rem)' }} />
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="relative">
          <div className={`absolute inset-0 rounded-full blur-md ${afterRallyMode ? 'bg-purple-400/20' : 'bg-white/20'}`} />
          <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
        </Link>
        
        {afterRallyMode ? (
          <Badge className="bg-purple-500/30 text-purple-100 border-purple-400/30 px-3 py-1.5 text-sm font-semibold shadow-lg backdrop-blur-sm">
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
          <div className={`absolute inset-0 rounded-full blur-md scale-110 ${afterRallyMode ? 'bg-purple-400/20' : 'bg-white/20'}`} />
          <Avatar className={`h-11 w-11 ring-2 hover:ring-white transition-all relative shadow-lg ${
            afterRallyMode ? 'ring-purple-300/40' : 'ring-white/40'
          }`}>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className={`text-sm font-bold ${
              afterRallyMode ? 'bg-purple-900/80 text-purple-200' : 'bg-white/10 text-white backdrop-blur-sm'
            }`}>
              {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
