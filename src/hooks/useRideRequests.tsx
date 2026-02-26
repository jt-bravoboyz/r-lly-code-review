import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RideRequestData {
  event_id?: string;
  pickup_location?: string;
  requester_id?: string;
  requester_name?: string;
}

interface RideRequest {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  data: RideRequestData | null;
  read: boolean | null;
  created_at: string;
  requester?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useRideRequests(eventId?: string) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for ride request notifications
  useEffect(() => {
    const channel = supabase
      .channel('ride-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Only invalidate if it's a ride_request type
          const newData = payload.new as { type?: string } | null;
          if (newData?.type === 'ride_request' || payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['ride-requests'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['ride-requests', eventId],
    queryFn: async () => {
      // Fetch ride_request notifications
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('type', 'ride_request')
        .order('created_at', { ascending: false });
      
      const { data: requests, error } = await query;
      if (error) throw error;

      // Filter by event if specified
      let filteredRequests = requests || [];
      if (eventId) {
        filteredRequests = filteredRequests.filter(r => {
          const reqData = r.data as RideRequestData | null;
          return reqData?.event_id === eventId;
        });
      }

      // Fetch requester profiles
      const requesterIds = filteredRequests
        .map(r => {
          const reqData = r.data as RideRequestData | null;
          return reqData?.requester_id;
        })
        .filter(Boolean) as string[];

      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', requesterIds);

        return filteredRequests.map(req => {
          const reqData = req.data as RideRequestData | null;
          return {
            ...req,
            data: reqData,
            requester: profiles?.find(p => p.id === reqData?.requester_id)
          };
        }) as RideRequest[];
      }

      return filteredRequests.map(req => ({
        ...req,
        data: req.data as RideRequestData | null
      })) as RideRequest[];
    }
  });
}

export function useDismissRideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Mark the notification as read to "dismiss" it
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride-requests'] });
    }
  });
}

export function useAcceptRideRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      requesterId, 
      pickupLocation,
      eventId 
    }: { 
      requestId: string; 
      requesterId: string;
      pickupLocation?: string;
      eventId?: string;
    }) => {
      if (!profile) throw new Error('Must be logged in');

      // Create a ride for this DD
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert({
          driver_id: profile.id,
          event_id: eventId || null,
          pickup_location: pickupLocation || 'TBD',
          destination: 'Event Location',
          available_seats: 4,
          departure_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
          status: 'available'
        })
        .select()
        .single();
      
      if (rideError) throw rideError;

      // Add the requester as a passenger with accepted status
      const { error: passengerError } = await supabase
        .from('ride_passengers')
        .insert({
          ride_id: ride.id,
          passenger_id: requesterId,
          pickup_location: pickupLocation,
          status: 'accepted'
        });

      if (passengerError) throw passengerError;

      // Mark the notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', requestId);

      const notificationTitle = 'Ride Accepted! 🚗';
      const notificationBody = `${profile.display_name || 'A DD'} is coming to pick you up!`;

      // Create in-app notification for the requester
      await supabase
        .from('notifications')
        .insert({
          profile_id: requesterId,
          type: 'ride_accepted',
          title: notificationTitle,
          body: notificationBody,
          data: {
            ride_id: ride.id,
            driver_id: profile.id,
            driver_name: profile.display_name,
            event_id: eventId
          }
        });

      // Send push notification to the requester
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              driverProfileIds: [requesterId],
              title: notificationTitle,
              body: notificationBody,
              tag: `ride-accepted-${ride.id}`,
              data: {
                type: 'ride_accepted',
                rideId: ride.id,
                eventId: eventId
              }
            }
          });
          if (import.meta.env.DEV) console.log('[useAcceptRideRequest] Push notification sent to requester');
        }
      } catch (pushError) {
        console.error('[useAcceptRideRequest] Failed to send push notification:', pushError);
        // Don't throw - push notification failure shouldn't block the main operation
      }

      return ride;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    }
  });
}
