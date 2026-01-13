-- One-time cleanup: Delete orphan events created before chat trigger existed
-- These events have 0 attendees and no associated chat
DELETE FROM events 
WHERE id IN (
  '050381e1-4742-473d-a0c3-5f8874315a6e',
  '8c32e5f1-923a-40ce-be04-b17f3b6b0523'
);