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
      <LegalSection title="Acknowledgment of Risks">
        <p>
          <strong className="text-foreground">ALCOHOL CONSUMPTION ACKNOWLEDGMENT:</strong> By using R@lly to coordinate events where alcohol may be present, I hereby acknowledge and understand that the consumption of alcoholic beverages carries inherent risks including, but not limited to, impaired judgment, reduced motor function, health complications, and potential legal consequences.
        </p>
      </LegalSection>

      <LegalSection title="Personal Responsibility & Conduct">
        <p>
          I understand and acknowledge that:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>I am solely responsible for my alcohol consumption, level of impairment, and all decisions I make while under the influence of alcohol.</li>
          <li>I am of legal drinking age in my jurisdiction if I choose to consume alcohol.</li>
          <li>I will monitor my own alcohol intake and make responsible decisions regarding my safety and the safety of others.</li>
          <li>I will not operate a motor vehicle or engage in any dangerous activities while impaired.</li>
          <li>I am responsible for arranging safe transportation if I become impaired.</li>
        </ul>
      </LegalSection>

      <LegalSection title="No Supervision or Monitoring">
        <p>
          <strong className="text-foreground">R@lly and Bravo Boyz LLC do not monitor, supervise, or control:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Individual drinking behavior or alcohol consumption levels</li>
          <li>In-person activities at events coordinated through the app</li>
          <li>The actions, decisions, or conduct of any user while impaired</li>
          <li>The safety or sobriety of any event attendee</li>
        </ul>
      </LegalSection>

      <LegalSection title="Assumption of Risk">
        <p>
          I voluntarily assume all risks associated with alcohol consumption and events where alcohol is present, including but not limited to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Personal injury or illness resulting from alcohol consumption</li>
          <li>Accidents, falls, or physical harm while impaired</li>
          <li>Impaired judgment leading to poor decision-making</li>
          <li>Interactions with other impaired individuals</li>
          <li>Property damage or loss</li>
          <li>Legal consequences arising from my conduct</li>
        </ul>
      </LegalSection>

      <LegalSection title="Release of Liability">
        <p>
          <strong className="text-foreground">I hereby release, waive, and forever discharge R@lly, Bravo Boyz LLC, their officers, directors, employees, agents, affiliates, successors, and assigns (collectively, the "Released Parties") from any and all claims, demands, damages, costs, expenses, actions, and causes of action, whether in law or equity, arising out of or related to:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>My consumption of alcohol at any event coordinated through R@lly</li>
          <li>Any injury, illness, or harm I suffer while impaired</li>
          <li>Any incident occurring during barhopping or multi-venue events</li>
          <li>Actions of other impaired users or event attendees</li>
          <li>Any transportation-related incidents while impaired</li>
        </ul>
      </LegalSection>

      <LegalSection title="Indemnification">
        <p>
          I agree to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or related to my alcohol consumption, impairment, or any actions I take while under the influence of alcohol during events coordinated through R@lly.
        </p>
      </LegalSection>
    </div>
  );
}

export function RideCoordinationWaiver() {
  return (
    <div className="space-y-6">
      <LegalSection title="Service Clarification">
        <p>
          <strong className="text-foreground">RIDE COORDINATION ACKNOWLEDGMENT:</strong> I understand and acknowledge that R@lly is a coordination platform only. R@lly does NOT provide transportation services, employ drivers, own vehicles, or operate as a transportation company in any capacity.
        </p>
        <p>
          R@lly merely facilitates communication between users who wish to coordinate rides. All transportation arrangements are made directly between users at their own discretion and risk.
        </p>
      </LegalSection>

      <LegalSection title="No Driver Verification">
        <p>
          <strong className="text-foreground">I understand and acknowledge that Bravo Boyz LLC does NOT verify, screen, or validate:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The driving ability, experience, or skill of any user offering rides</li>
          <li>The sobriety or impairment level of any driver</li>
          <li>The validity of any driver's license or insurance</li>
          <li>The safety, condition, or roadworthiness of any vehicle</li>
          <li>The criminal background or history of any user</li>
        </ul>
      </LegalSection>

      <LegalSection title="User Responsibilities">
        <p>
          I understand and acknowledge that:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>I am solely responsible for evaluating the safety of any ride I accept or offer.</li>
          <li>I will not accept rides from drivers who appear impaired, fatigued, or otherwise unfit to drive.</li>
          <li>I will not offer rides if I am impaired, fatigued, or otherwise unfit to drive safely.</li>
          <li>I will comply with all applicable traffic laws, regulations, and safety requirements.</li>
          <li>I am responsible for ensuring I have proper vehicle insurance if offering rides.</li>
          <li>I will use appropriate safety equipment including seatbelts at all times.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Assumption of Risk">
        <p>
          I voluntarily assume all risks associated with ride coordination through R@lly, including but not limited to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Motor vehicle accidents, collisions, or crashes</li>
          <li>Personal injury, disability, or death</li>
          <li>Property damage or loss</li>
          <li>Rides with impaired, unlicensed, or unsafe drivers</li>
          <li>Vehicle mechanical failures or breakdowns</li>
          <li>Delays, route changes, or failure to arrive at destination</li>
          <li>Criminal acts or misconduct by other users</li>
        </ul>
      </LegalSection>

      <LegalSection title="Release of Liability">
        <p>
          <strong className="text-foreground">I hereby release, waive, and forever discharge R@lly, Bravo Boyz LLC, their officers, directors, employees, agents, affiliates, successors, and assigns (collectively, the "Released Parties") from any and all claims, demands, damages, costs, expenses, actions, and causes of action, whether in law or equity, arising out of or related to:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Any accident, injury, or harm occurring during rides coordinated through R@lly</li>
          <li>The conduct, actions, or negligence of any driver or passenger</li>
          <li>Driver impairment, recklessness, or violation of traffic laws</li>
          <li>Vehicle condition, maintenance, or mechanical failures</li>
          <li>Any delays, cancellations, or failures in transportation</li>
        </ul>
      </LegalSection>

      <LegalSection title="Indemnification">
        <p>
          I agree to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or related to my participation in ride coordination through R@lly, whether as a driver or passenger.
        </p>
      </LegalSection>

      <LegalSection title="Acknowledgment">
        <p>
          I understand that R@lly and Bravo Boyz LLC provide this platform solely as a means to connect users for ride coordination purposes. <strong className="text-foreground">The Released Parties do not assume any responsibility for the conduct of any driver, the outcome of any ride, or any incident that may occur during transportation arranged through this platform.</strong>
        </p>
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
