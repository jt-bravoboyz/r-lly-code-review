import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileText, GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";

const appWorkflowChart = `flowchart TD
    subgraph AUTH["🔐 AUTHENTICATION"]
        A[App Launch] --> B{Session Check}
        B -->|No Session| C[Auth Page]
        B -->|Has Session| D[Home Dashboard]
        C --> E[Sign Up]
        C --> F[Sign In]
        E --> G[Policy Acceptance]
        G --> H[Onboarding Tutorial]
        F --> D
        H --> D
    end

    subgraph HOME["🏠 HOME DASHBOARD"]
        D --> I[Rally Home Button]
        D --> J[Going Home Tracker]
        D --> K[Quick Actions Grid]
        D --> L[Notification Bell]
        I --> M[Set Home Destination]
        J --> N[Track Friends Going Home]
    end

    subgraph NAV["📍 NAVIGATION"]
        K --> O[Events]
        K --> P[Rides]
        K --> Q[Squads]
        K --> R[Chat]
        K --> S[Profile]
        L --> T[Notifications Page]
    end

    subgraph EVENTS["🎉 EVENTS FLOW"]
        O --> U[View All Events]
        U --> V[Create Event]
        U --> W[Join via Code]
        U --> X[Event Detail]
        V --> Y[Standard Event]
        V --> Z[Quick Rally]
        V --> AA[Bar Hop Event]
        X --> AB[Live Tracking]
        X --> AC[Event Chat]
        X --> AD[Attendee List]
        X --> AE[Share Invite Code]
        AA --> AF[Bar Hop Stops Manager]
        AF --> AG[Add/Remove Stops]
        AF --> AH[Mark Arrived/Departed]
    end

    subgraph RIDES["🚗 RIDES FLOW"]
        P --> AI[View Rides]
        AI --> AJ[Offer Ride]
        AI --> AK[Request Ride]
        AJ --> AL[DD Disclaimer]
        AL --> AM[Create Ride Listing]
        AK --> AN[Find Available Rides]
        AN --> AO[Request Seat]
        AO --> AP[Driver Approval]
    end

    subgraph SOCIAL["👥 SOCIAL FEATURES"]
        Q --> AQ[My Squads]
        AQ --> AR[Create Squad]
        AQ --> AS[View Squad Members]
        AR --> AT[Invite via Link/Email/Phone]
        R --> AU[Event Chats]
        R --> AV[Direct Messages]
        AU --> AW[Real-time Messaging]
        AV --> AW
    end

    subgraph TRACKING["📡 LIVE TRACKING"]
        AB --> AX[Attendee Map]
        AX --> AY[Member Location Cards]
        AY --> AZ[Find Friend Navigation]
        AZ --> BA[Turn-by-Turn Directions]
        AX --> BB[Accuracy Indicator]
        BB --> BC[Poor Signal Alerts]
    end

    subgraph PROFILE["👤 PROFILE & SETTINGS"]
        S --> BD[View/Edit Profile]
        BD --> BE[Avatar Upload]
        BD --> BF[Display Name]
        BD --> BG[Bio]
        S --> BH[Settings]
        BH --> BI[Notification Preferences]
        BH --> BJ[Location Settings]
        BH --> BK[Saved Locations]
        BH --> BL[Theme Toggle]
        BH --> BM[Tutorial Restart]
    end`;

const featureFunctionsChart = `flowchart LR
    subgraph AUTH_FUNCS["🔐 Authentication Functions"]
        direction TB
        A1[signUp] --> A2[Create Account]
        A3[signIn] --> A4[Validate Credentials]
        A5[signOut] --> A6[Clear Session]
        A7[refreshProfile] --> A8[Fetch Latest Data]
        A9[policyAcceptance] --> A10[Store Consent]
    end

    subgraph EVENT_FUNCS["🎉 Event Management"]
        direction TB
        B1[createEvent] --> B2[Insert to DB]
        B3[joinEvent] --> B4[Add Attendee Record]
        B5[leaveEvent] --> B6[Remove Attendee]
        B7[updateEventStatus] --> B8[Modify Event Data]
        B9[generateInviteCode] --> B10[Secure Random Code]
        B11[addCohost] --> B12[Grant Permissions]
    end

    subgraph TRACKING_FUNCS["📡 Live Tracking"]
        direction TB
        C1[updateLocation] --> C2[GPS Coordinates]
        C3[shareLocation] --> C4[Toggle Visibility]
        C5[getAttendeeLocations] --> C6[Fetch All Positions]
        C7[calculateDistance] --> C8[Haversine Formula]
        C9[monitorAccuracy] --> C10[Signal Quality Check]
    end

    subgraph RIDE_FUNCS["🚗 Ride Management"]
        direction TB
        D1[offerRide] --> D2[Create Ride Listing]
        D3[requestRide] --> D4[Send Request]
        D5[approvePassenger] --> D6[Update Status]
        D7[cancelRide] --> D8[Notify Passengers]
        D9[updateSeats] --> D10[Modify Availability]
    end

    subgraph SQUAD_FUNCS["👥 Squad Management"]
        direction TB
        E1[createSquad] --> E2[New Squad Record]
        E3[inviteMember] --> E4[Generate Invite]
        E5[joinSquad] --> E6[Add Member]
        E7[leaveSquad] --> E8[Remove Member]
        E9[deleteSquad] --> E10[Cascade Delete]
    end

    subgraph CHAT_FUNCS["💬 Chat Functions"]
        direction TB
        F1[sendMessage] --> F2[Insert Message]
        F3[subscribeToChat] --> F4[Realtime Channel]
        F5[markAsRead] --> F6[Update Read Status]
        F7[getEventChat] --> F8[Fetch/Create Chat]
    end

    subgraph NOTIF_FUNCS["🔔 Notifications"]
        direction TB
        G1[sendPushNotification] --> G2[Web Push API]
        G3[createNotification] --> G4[Store in DB]
        G5[markNotificationRead] --> G6[Update Status]
        G7[subscribeToNotifs] --> G8[Realtime Updates]
    end

    subgraph HOME_FUNCS["🏠 Going Home Tracker"]
        direction TB
        H1[setGoingHome] --> H2[Update Attendee]
        H3[setDestination] --> H4[Store Coordinates]
        H5[markArrivedHome] --> H6[Update Status]
        H7[trackFriendProgress] --> H8[Calculate ETA]
    end

    subgraph ACHIEVE_FUNCS["🏆 Achievements"]
        direction TB
        I1[checkBadgeEligibility] --> I2[Evaluate Criteria]
        I3[awardBadge] --> I4[Update Profile]
        I5[addRewardPoints] --> I6[Increment Points]
        I7[getBadgeProgress] --> I8[Calculate Completion]
    end`;

const Documentation = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("workflow");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${name} copied to clipboard!`);
  };

  const downloadAsTxt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Rally Documentation
          </h1>
          <p className="text-muted-foreground text-sm">
            Private flowcharts for app architecture reference
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              How to View Flowcharts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Copy the Mermaid code and paste it into:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Mermaid Live Editor:</strong> <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-primary underline">mermaid.live</a></li>
              <li><strong>VS Code:</strong> Install "Mermaid Preview" extension</li>
              <li><strong>Notion/Obsidian:</strong> Paste in a code block with "mermaid" language</li>
              <li><strong>GitHub:</strong> Paste in markdown with ```mermaid code fence</li>
            </ul>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflow">App Workflow</TabsTrigger>
            <TabsTrigger value="features">Feature Functions</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Complete App Workflow</CardTitle>
                <p className="text-sm text-muted-foreground">
                  End-to-end user journey through Rally
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(appWorkflowChart, "App Workflow")}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAsTxt(appWorkflowChart, "rally-app-workflow.txt")}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <code>{appWorkflowChart}</code>
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Feature Functions Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed functions for each core feature
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(featureFunctionsChart, "Feature Functions")}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAsTxt(featureFunctionsChart, "rally-feature-functions.txt")}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <code>{featureFunctionsChart}</code>
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
              ⚠️ This page is only visible to authenticated users
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Documentation;
