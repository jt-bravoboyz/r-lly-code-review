-- Fix handle_new_user to include phone number from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Invalid user data: missing id';
  END IF;
  
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id, 
    SUBSTRING(
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      1, 100
    ),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add UPDATE policy for phone_contacts
CREATE POLICY "Users can update their own contacts"
ON public.phone_contacts FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id))
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));