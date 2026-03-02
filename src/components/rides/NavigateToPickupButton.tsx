import { Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface NavigateToPickupButtonProps {
  pickupLocation: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  passengerName?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export function NavigateToPickupButton({
  pickupLocation,
  pickupLat,
  pickupLng,
  passengerName,
  size = 'sm',
  variant = 'outline',
  className = '',
}: NavigateToPickupButtonProps) {
  const url = pickupLat && pickupLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`
    : pickupLocation
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLocation)}`
      : null;

  if (!url) return null;

  const handleClick = () => {
    if (passengerName) {
      toast.success(`Navigating to pick up ${passengerName}`);
    }
  };

  if (size === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 ${className}`}
        title={`Navigate to ${passengerName || 'pickup'}`}
        onClick={handleClick}
      >
        <Navigation className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${className}`}
      onClick={handleClick}
    >
      <Navigation className="h-3.5 w-3.5 mr-1.5" />
      Navigate
    </a>
  );
}
