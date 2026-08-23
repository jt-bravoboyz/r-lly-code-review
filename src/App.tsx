import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TutorialProvider } from "@/hooks/useTutorial";
import { RallyOnboardingProvider } from "@/contexts/RallyOnboardingContext";
import { TierUpProvider } from "@/contexts/TierUpContext";
import { NavigationPortal } from "@/components/navigation/NavigationPortal";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { RallyOnboardingOverlay } from "@/components/onboarding/RallyOnboardingOverlay";
import { AuthRedirectGuard } from "@/components/AuthRedirectGuard";
import { AppEntry } from "@/components/AppEntry";
import { NativeBootstrap } from "@/components/NativeBootstrap";
import { PhotoPermissionDialog } from "@/components/events/PhotoPermissionDialog";
import { PublicProfileProvider } from "@/contexts/PublicProfileContext";
import { DirectMessageProvider } from "@/contexts/DirectMessageContext";
import { ConnectionStatusBanner } from "@/components/layout/ConnectionStatusBanner";
import Index from "./pages/Index";
import ReturningAuth from "./pages/ReturningAuth";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Rides from "./pages/Rides";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Squads from "./pages/Squads";
import SquadDetail from "./pages/SquadDetail";
import Achievements from "./pages/Achievements";
import JoinRally from "./pages/JoinRally";
import Friends from "./pages/Friends";
import JoinSquad from "./pages/JoinSquad";
import Legal from "./pages/Legal";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import InviteHistory from "./pages/InviteHistory";
import AdminDashboard from "./pages/AdminDashboard";
import Unsubscribe from "./pages/Unsubscribe";
import SplitCheckHome from "./pages/SplitCheckHome";
import SplitGuestPay from "./pages/SplitGuestPay";
import PastRallies from "./pages/PastRallies";
import UpcomingRallies from "./pages/UpcomingRallies";
import Demo from "./pages/Demo";
import DemoRallyHome from "./pages/DemoRallyHome";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <RallyOnboardingProvider>
            <TierUpProvider>
              <TooltipProvider>
                <DirectMessageProvider>
                <PublicProfileProvider>

                <ConnectionStatusBanner />
                <Toaster />
                <Sonner />
                <NavigationPortal />
                <PhotoPermissionDialog />
                <BrowserRouter>
                  <NativeBootstrap />
                  <RallyOnboardingOverlay />
                  <AuthRedirectGuard />
                  <TutorialProvider>
                    <TutorialOverlay />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      {/* New users: onboarding + signup */}
                      <Route path="/auth" element={<AppEntry />} />
                      {/* Returning users: dedicated login page */}
                      <Route path="/auth/return" element={<ReturningAuth />} />
                      <Route path="/Auth/return" element={<ReturningAuth />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/events/:id" element={<EventDetail />} />
                      <Route path="/join" element={<JoinRally />} />
                      <Route path="/join/:code" element={<JoinRally />} />
                      <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
                      <Route path="/rides" element={<RequireAuth><Rides /></RequireAuth>} />
                      <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
                      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                      <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
                      <Route path="/squads" element={<RequireAuth><Squads /></RequireAuth>} />
                      <Route path="/squads/:squadId" element={<RequireAuth><SquadDetail /></RequireAuth>} />
                      <Route path="/achievements" element={<RequireAuth><Achievements /></RequireAuth>} />
                      <Route path="/legal" element={<Legal />} />
                      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                      <Route path="/docs" element={<RequireAuth><Documentation /></RequireAuth>} />
                      <Route path="/join-squad/:code" element={<JoinSquad />} />
                      <Route path="/invite-history" element={<RequireAuth><InviteHistory /></RequireAuth>} />
                      <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                      <Route path="/unsubscribe" element={<Unsubscribe />} />
                      <Route path="/tabs" element={<RequireAuth><SplitCheckHome /></RequireAuth>} />
                      <Route path="/tab/pay/:requestId" element={<SplitGuestPay />} />
                      <Route path="/rallies/past" element={<RequireAuth><PastRallies /></RequireAuth>} />
                      <Route path="/rallies/upcoming" element={<RequireAuth><UpcomingRallies /></RequireAuth>} />
                      <Route path="/demo" element={<Demo />} />
                      {import.meta.env.DEV && <Route path="/demo/rally-home" element={<DemoRallyHome />} />}
                      <Route path="*" element={<NotFound />} />

                    </Routes>
                  </TutorialProvider>
                </BrowserRouter>
                </PublicProfileProvider>
                </DirectMessageProvider>

              </TooltipProvider>
            </TierUpProvider>
          </RallyOnboardingProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;