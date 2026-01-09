import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">{title}</h3>
      <div className="text-muted-foreground text-sm leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export function AboutTheApp() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        R@lly is a real-time social coordination app designed to help users create events, track friends during group outings, manage barhopping movement, coordinate transportation, and stay connected with their groups.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        R@lly provides digital tools for coordination. <strong className="text-foreground">It does not control or supervise in-person activity.</strong>
      </p>
      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-primary font-medium">
          Owned and Operated by Bravo Boyz LLC
        </p>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="space-y-6">
      <LegalSection title="Information We Collect">
        <p>
          R@lly collects the information needed to create and operate user accounts including name, email, profile details, and optional photos.
        </p>
        <p>
          The app also collects device location data when using features such as Barhopping Mode, Rally Ride, or directional friend tracking. <strong className="text-foreground">Location data is used only while the feature is active.</strong>
        </p>
      </LegalSection>

      <LegalSection title="How We Use Your Data">
        <p>
          <strong className="text-foreground">Bravo Boyz LLC does not sell personal data.</strong> Information is only shared with third-party service providers when required for hosting, authentication, analytics, and essential app functions.
        </p>
        <p>
          Third-party providers are not permitted to use R@lly user information for their own purposes.
        </p>
      </LegalSection>

      <LegalSection title="Legal Disclosure">
        <p>
          Bravo Boyz LLC may disclose information if required by law.
        </p>
      </LegalSection>

      <LegalSection title="Your Rights">
        <p>
          Users may update or delete their profiles at any time. Users may disable location access, though certain features will not work without it.
        </p>
      </LegalSection>

      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">By using the app, you consent to this policy.</strong>
        </p>
      </div>
    </div>
  );
}

export function TermsAndConditions() {
  return (
    <div className="space-y-6">
      <LegalSection title="User Responsibilities">
        <p>
          Users must provide accurate information, use the app legally and responsibly, and accept responsibility for all real-world actions during events.
        </p>
      </LegalSection>

      <LegalSection title="Service Limitations">
        <p>
          R@lly provides coordination tools and does not guarantee perfect accuracy in GPS, location services, sensor data, or real-time updates.
        </p>
        <p>
          The app may experience slowdowns or outages due to device issues or third-party failures.
        </p>
      </LegalSection>

      <LegalSection title="Liability Disclaimer">
        <p>
          <strong className="text-foreground">Bravo Boyz LLC is not responsible for:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Injuries or incidents</li>
          <li>Transportation outcomes</li>
          <li>Alcohol-related events</li>
          <li>Misuse of tracking features</li>
          <li>Lost data or lost profits</li>
          <li>Inaccurate tracking data</li>
          <li>Unauthorized access caused by user actions</li>
          <li>Damages connected to real-world events coordinated through the app</li>
        </ul>
      </LegalSection>

      <LegalSection title="Account Management">
        <p>
          Bravo Boyz LLC may suspend accounts for violations or safety risks. The company may update policies at any time.
        </p>
        <p>
          <strong className="text-foreground">Continued use of the app means acceptance of updates.</strong>
        </p>
      </LegalSection>

      <LegalSection title="Governing Law">
        <p>
          This agreement is governed by Georgia law unless local laws apply.
        </p>
      </LegalSection>
    </div>
  );
}

export function CommunityGuidelines() {
  return (
    <div className="space-y-6">
      <LegalSection title="Respect & Safety">
        <p>
          Users must treat each other respectfully and avoid harassment, threats, discrimination, or intimidation.
        </p>
      </LegalSection>

      <LegalSection title="Prohibited Behavior">
        <p>
          <strong className="text-foreground">Users may NOT:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pressure others into unsafe behavior</li>
          <li>Misuse location tracking</li>
          <li>Share private information without consent</li>
          <li>Coordinate harmful or illegal activity</li>
          <li>Create fake accounts</li>
          <li>Impersonate others</li>
          <li>Hack the app</li>
          <li>Upload illegal content</li>
        </ul>
      </LegalSection>

      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <p className="text-sm text-destructive font-medium">
          Violations may result in account suspension or removal.
        </p>
      </div>
    </div>
  );
}

export function AlcoholLiabilityRelease() {
  return (
    <div className="space-y-6">
      <LegalSection title="Personal Responsibility">
        <p>
          <strong className="text-foreground">Users agree they are responsible for:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Their alcohol consumption</li>
          <li>Their impairment level</li>
          <li>Their transportation choices</li>
          <li>Their safety</li>
        </ul>
      </LegalSection>

      <LegalSection title="No Supervision">
        <p>
          <strong className="text-foreground">Bravo Boyz LLC does not monitor drinking behavior or supervise in-person drinking activities.</strong>
        </p>
      </LegalSection>

      <LegalSection title="Assumption of Risk">
        <p>
          Users assume all risks associated with alcohol including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Injury</li>
          <li>Accidents</li>
          <li>Impaired judgment</li>
          <li>Interactions with impaired individuals</li>
        </ul>
      </LegalSection>

      <LegalSection title="Release of Liability">
        <p>
          <strong className="text-foreground">Users release Bravo Boyz LLC from liability for:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Alcohol consumption</li>
          <li>Incidents during travel</li>
          <li>Injuries during barhopping</li>
          <li>Actions of impaired users</li>
        </ul>
      </LegalSection>
    </div>
  );
}

export function RideCoordinationWaiver() {
  return (
    <div className="space-y-6">
      <LegalSection title="Service Clarification">
        <p>
          <strong className="text-foreground">R@lly does not provide transportation.</strong> It only helps users coordinate rides.
        </p>
        <p>
          Bravo Boyz LLC does not verify driving ability, sobriety, or safety of any driver.
        </p>
      </LegalSection>

      <LegalSection title="User Responsibilities">
        <p>
          Users are responsible for all transportation decisions. Users agree:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Not to ride with impaired drivers</li>
          <li>To follow all traffic laws</li>
        </ul>
      </LegalSection>

      <LegalSection title="Assumption of Risk">
        <p>
          Users assume all risks related to transportation arranged through the app including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Accidents</li>
          <li>Injury</li>
          <li>Unsafe drivers</li>
          <li>Vehicle issues</li>
        </ul>
      </LegalSection>

      <LegalSection title="Release of Liability">
        <p>
          <strong className="text-foreground">Users release Bravo Boyz LLC from liability for:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Accidents</li>
          <li>Delays</li>
          <li>Driver impairment</li>
          <li>Injuries connected to ride coordination</li>
        </ul>
      </LegalSection>
    </div>
  );
}

export function AcceptanceOfPolicies() {
  return (
    <div className="space-y-6">
      <LegalSection title="Agreement">
        <p>
          By creating an account or using the app, users agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Privacy Policy</li>
          <li>Terms and Conditions</li>
          <li>Community Guidelines</li>
          <li>Alcohol Liability Release</li>
          <li>Ride Coordination Waiver</li>
        </ul>
      </LegalSection>

      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-foreground font-medium">
          These policies form the complete agreement between the user and Bravo Boyz LLC.
        </p>
      </div>
    </div>
  );
}
