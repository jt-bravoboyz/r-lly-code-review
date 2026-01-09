import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import rallyLogo from '@/assets/rally-logo.png';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="h-6" />
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/">
          <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
        </Link>
        
        {title && (
          <h1 className="text-xl font-bold text-rally-dark font-montserrat">{title}</h1>
        )}
        
        <Link to="/profile">
          <Avatar className="h-10 w-10 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
