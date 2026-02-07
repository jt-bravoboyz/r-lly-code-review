-- Add column to track if user has been shown the location prompt for this rally
ALTER TABLE event_attendees 
ADD COLUMN location_prompt_shown boolean DEFAULT false;