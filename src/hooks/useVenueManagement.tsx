import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  floor_count: number;
  venue_type: string;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueBeacon {
  id: string;
  venue_id: string;
  beacon_uuid: string;
  major: number | null;
  minor: number | null;
  name: string;
  lat: number;
  lng: number;
  floor: number;
  tx_power: number;
  zone_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VenueWithBeacons extends Venue {
  beacons: VenueBeacon[];
}

// Fetch all venues
export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Venue[];
    },
  });
}

// Fetch user's venues (ones they created)
export function useMyVenues() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['my-venues', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('created_by', profile.id)
        .order('name');
      
      if (error) throw error;
      return data as Venue[];
    },
    enabled: !!profile?.id,
  });
}

// Fetch a single venue with its beacons
export function useVenueWithBeacons(venueId: string | null) {
  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
      
      if (venueError) throw venueError;
      
      const { data: beacons, error: beaconsError } = await supabase
        .from('venue_beacons')
        .select('*')
        .eq('venue_id', venueId)
        .order('floor', { ascending: true });
      
      if (beaconsError) throw beaconsError;
      
      return {
        ...venue,
        beacons: beacons || [],
      } as VenueWithBeacons;
    },
    enabled: !!venueId,
  });
}

// Fetch beacons for indoor positioning (active beacons only)
export function useActiveBeacons() {
  return useQuery({
    queryKey: ['active-beacons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_beacons')
        .select(`
          *,
          venue:venues(id, name, address, lat, lng)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Create a new venue
export function useCreateVenue() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (venue: Omit<Venue, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('venues')
        .insert({
          ...venue,
          created_by: profile.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['my-venues'] });
      toast.success('Venue created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create venue: ' + error.message);
    },
  });
}

// Update a venue
export function useUpdateVenue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...venue }: Partial<Venue> & { id: string }) => {
      const { data, error } = await supabase
        .from('venues')
        .update(venue)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['my-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
      toast.success('Venue updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update venue: ' + error.message);
    },
  });
}

// Delete a venue
export function useDeleteVenue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (venueId: string) => {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['my-venues'] });
      toast.success('Venue deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete venue: ' + error.message);
    },
  });
}

// Create a beacon
export function useCreateBeacon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (beacon: Omit<VenueBeacon, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('venue_beacons')
        .insert(beacon)
        .select()
        .single();
      
      if (error) throw error;
      return data as VenueBeacon;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venue', data.venue_id] });
      queryClient.invalidateQueries({ queryKey: ['active-beacons'] });
      toast.success('Beacon added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add beacon: ' + error.message);
    },
  });
}

// Update a beacon
export function useUpdateBeacon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...beacon }: Partial<VenueBeacon> & { id: string }) => {
      const { data, error } = await supabase
        .from('venue_beacons')
        .update(beacon)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as VenueBeacon;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venue', data.venue_id] });
      queryClient.invalidateQueries({ queryKey: ['active-beacons'] });
      toast.success('Beacon updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update beacon: ' + error.message);
    },
  });
}

// Delete a beacon
export function useDeleteBeacon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ beaconId, venueId }: { beaconId: string; venueId: string }) => {
      const { error } = await supabase
        .from('venue_beacons')
        .delete()
        .eq('id', beaconId);
      
      if (error) throw error;
      return { venueId };
    },
    onSuccess: ({ venueId }) => {
      queryClient.invalidateQueries({ queryKey: ['venue', venueId] });
      queryClient.invalidateQueries({ queryKey: ['active-beacons'] });
      toast.success('Beacon deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete beacon: ' + error.message);
    },
  });
}
