import { AddPeopleSheet } from './AddPeopleSheet';

// Re-export the unified Add People button as the contact sync entry point
// This replaces the old mobile-only ContactSyncButton
export function ContactSyncButton() {
  return <AddPeopleSheet />;
}
