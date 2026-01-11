-- Fix Message Sending Reliability
-- Drop the broken squad message INSERT policy that incorrectly compares owner_id to auth.uid()
DROP POLICY IF EXISTS "Squad members can send messages to squad chats" ON public.messages;

-- The correctly-implemented policy "Squad members can send squad chat messages" will remain
-- and properly handles squad chat inserts by checking via profiles table

-- Add After R@lly tracking columns to event_attendees
ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS after_rally_opted_in BOOLEAN DEFAULT false;

ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS after_rally_location_name TEXT;