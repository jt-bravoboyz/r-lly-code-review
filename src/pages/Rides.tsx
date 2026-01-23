import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Rides redirect page - rides are now managed within each event
 * This page handles backwards compatibility for deep links and bookmarks
 */
export default function Rides() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event');

  useEffect(() => {
    // If there's an event ID, redirect to that event's rides tab
    if (eventId) {
      navigate(`/events/${eventId}`, { replace: true });
    } else {
      toast.info('Rides are now managed within each event', {
        description: 'Open an event to offer or request rides',
        duration: 4000,
      });
      navigate('/events', { replace: true });
    }
  }, [navigate, eventId]);

  return null;
}
