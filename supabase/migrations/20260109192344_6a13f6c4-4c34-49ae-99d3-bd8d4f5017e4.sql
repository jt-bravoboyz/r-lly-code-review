-- Create saved_locations table for favorite locations
CREATE TABLE public.saved_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  icon TEXT DEFAULT 'pin',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved locations" 
ON public.saved_locations 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can create their own saved locations" 
ON public.saved_locations 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own saved locations" 
ON public.saved_locations 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can delete their own saved locations" 
ON public.saved_locations 
FOR DELETE 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_locations_updated_at
BEFORE UPDATE ON public.saved_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_saved_locations_profile_id ON public.saved_locations(profile_id);