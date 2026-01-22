import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const handleNavigate = () => {
    let url: string;

    if (pickupLat && pickupLng) {
      // Use coordinates for precise navigation
      url = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;
    } else if (pickupLocation) {
      // Fallback to address search
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLocation)}`;
    } else {
      toast.error('No pickup location available');
      return;
    }

    // Open in new tab/app
    window.open(url, '_blank', 'noopener,noreferrer');
    
    if (passengerName) {
      toast.success(`Navigating to pick up ${passengerName}`);
    }
  };

  if (size === 'icon') {
    return (
      <Button
        size="icon"
        variant={variant}
        className={`h-7 w-7 ${className}`}
        onClick={handleNavigate}
        title={`Navigate to ${passengerName || 'pickup'}`}
      >
        <Navigation className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={`${className}`}
      onClick={handleNavigate}
    >
      <Navigation className="h-3.5 w-3.5 mr-1.5" />
      Navigate
    </Button>
  );
}
