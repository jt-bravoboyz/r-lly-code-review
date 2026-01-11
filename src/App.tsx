import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TutorialProvider } from "@/hooks/useTutorial";
import { NavigationPortal } from "@/components/navigation/NavigationPortal";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { AppEntry } from "@/components/AppEntry";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Rides from "./pages/Rides";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Squads from "./pages/Squads";
import Achievements from "./pages/Achievements";
import JoinRally from "./pages/JoinRally";
import JoinSquad from "./pages/JoinSquad";
import Legal from "./pages/Legal";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import InviteHistory from "./pages/InviteHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <NavigationPortal />
            <BrowserRouter>
              <TutorialProvider>
                <TutorialOverlay />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AppEntry />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/join" element={<JoinRally />} />
                  <Route path="/join/:code" element={<JoinRally />} />
                  <Route path="/rides" element={<Rides />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/squads" element={<Squads />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/docs" element={<Documentation />} />
                  <Route path="/join-squad/:code" element={<JoinSquad />} />
                  <Route path="/invite-history" element={<InviteHistory />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TutorialProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;