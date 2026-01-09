import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import rallyLogo from '@/assets/rally-logo.png';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  icon?: React.ReactNode;
}

export function Header({ title, icon }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-orange-500 shadow-lg shadow-primary/20">
      <div className="h-6" />
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="relative">
          <div className="absolute inset-0 bg-white/30 rounded-full blur-sm" />
          <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
        </Link>
        
        {title && (
          <h1 className="text-xl font-bold text-white font-montserrat drop-shadow-sm flex items-center gap-2">
            {icon || <User className="h-5 w-5" strokeWidth={2.5} />}
            {title}
          </h1>
        )}
        
        <Link to="/profile" className="relative group">
          <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110" />
          <Avatar className="h-11 w-11 ring-2 ring-white/50 hover:ring-white transition-all relative shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white text-primary text-sm font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
