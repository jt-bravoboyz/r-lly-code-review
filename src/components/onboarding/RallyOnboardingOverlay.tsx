import { RallyInviteBanner } from './RallyInviteBanner';
import { RallyRidesBanner } from './RallyRidesBanner';
import { LocationSharingBanner } from './LocationSharingBanner';

export function RallyOnboardingOverlay() {
  return (
    <>
      <RallyInviteBanner />
      <RallyRidesBanner />
      <LocationSharingBanner />
    </>
  );
}
