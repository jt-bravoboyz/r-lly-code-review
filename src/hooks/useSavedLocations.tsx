import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SavedLocation {
  id: string;
  profile_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedLocations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedLocations = [], isLoading } = useQuery({
    queryKey: ['saved-locations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_locations')
        .select('*')
        .eq('profile_id', profile.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as SavedLocation[];
    },
    enabled: !!profile?.id,
  });

  const saveLocation = useMutation({
    mutationFn: async (location: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      icon?: string;
      is_default?: boolean;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_locations')
        .insert({
          profile_id: profile.id,
          name: location.name,
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          icon: location.icon || 'pin',
          is_default: location.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      toast.success('Location saved!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save location');
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('saved_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      toast.success('Location removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove location');
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('saved_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update location');
    },
  });

  return {
    savedLocations,
    isLoading,
    saveLocation,
    deleteLocation,
    updateLocation,
  };
}
