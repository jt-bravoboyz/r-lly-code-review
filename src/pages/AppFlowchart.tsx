import { useState, useRef } from 'react';
import { ArrowLeft, Download, Printer, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AppFlowchart() {
  const [zoom, setZoom] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const handleResetZoom = () => setZoom(1);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a text version of the flowchart for download
    const flowchartText = `
R@LLY APP FLOWCHART
==================

🔐 AUTHENTICATION
├── App Launch
├── Check: Logged In?
│   ├── No → Auth Page
│   │   ├── Email/Password
│   │   ├── Google OAuth
│   │   └── Forgot Password → Reset Email Sent
│   └── Yes → Main App
└── Signed In

👥 SQUAD MANAGEMENT (Independent of Events)
├── Squads Page
├── View My Squads
├── Create New Squad
│   ├── Name Squad
│   └── Search & Select Profiles
├── Squad Created
├── Invite Friends (Email/SMS)
│   ├── Send Email Invite
│   ├── Send SMS Invite
│   └── Share Invite Link
└── Quick Rally from Squad Card

⚡ QUICK R@LLY FLOW
├── Quick R@lly Dialog
├── Enter Title & Location
├── Enable Bar Hop? (Yes/No)
├── Select Squad to Invite? (Optional)
├── Rally Starts NOW
├── 🎉 Confetti! Rally Created
├── Share Invite Code
└── Copy Link / Native Share

📅 PLANNED EVENT CREATION
├── Plan a Rally Dialog
├── Event Details
│   ├── Title + Description + Type
│   ├── Set Future Date & Time
│   └── Set Location
├── Enable Bar Hop at Creation? (Optional)
├── Event Created with Invite Code
└── Share to Squad + Others

🎟️ JOINING EVENTS
├── Join Rally Page
├── Enter Invite Code
├── Event Found?
│   ├── Yes → Join Event
│   └── No → Invalid Code Error
└── Navigate to Event

🎉 LIVE EVENT (All Features Available)
├── Event Detail Page
├── Details Tab
│   ├── Toggle Bar Hop Mode (Host/Cohost)
│   ├── Add Co-hosts
│   ├── Share Invite Code
│   └── Invite Anyone
├── 💬 Chat Tab (Always Available)
├── 📍 Track Tab (Always Available)
├── 🚗 Rides Tab (Always Available)
└── 🏠 R@lly Home (Always Available)

🍺 BAR HOP MODE
├── Bar Hop Enabled
├── Pre-Select Stops OR Add On-The-Go
│   ├── Add Stop (Name, Address, ETA)
│   ├── Reorder Stops
│   └── Remove Stops
├── Stops List with Map View
├── Host: Arrive at First Stop
├── Host: Move to Next Stop
│   └── 📢 NOTIFY ALL (Push + Chat)
├── Stop Status Updates
└── 🎉 Bar Hop Complete!

💬 EVENT CHAT
├── Group Chat for All Attendees
├── User Messages
└── System Bot Messages
    ├── 🍺 Moving to Next Stop
    ├── 📍 New Stop Added
    ├── 🏠 Someone Heading Home
    └── ✅ Someone Arrived Safe

📍 LIVE MEMBER TRACKING
├── Enable Location Sharing
├── See All Attendees on Map
├── Compass Direction to Friends
├── Distance to Each Member
└── Find a Friend Navigation

🚗 R@LLY RIDE (DD Mode)
├── View Available Rides
├── Offer a Ride as DD
│   ├── Set Pickup Location
│   ├── Set Destination
│   └── Set Available Seats
├── Ride Posted
├── Request a Seat
├── Driver Approves/Declines
│   └── 📢 Push Notification
└── Ride Confirmed

🏠 R@LLY HOME
├── Select Destination Type
│   ├── Home Address
│   ├── Friend's House
│   ├── Hotel
│   └── Custom Address
├── Start Navigation (Opens Maps)
├── 📢 Squad Notified: Heading Home
├── Appears on Going Home Tracker
├── I've Arrived Safely Button
├── ✅ Marked Safe in Tracker
└── 📢 Squad Notified: Arrived Safe

⚙️ SETTINGS
├── Profile Settings
├── Theme (Light/Dark/System)
├── Privacy Settings
├── Notification Preferences
│   ├── Bar Hop Transitions
│   ├── Ride Offers/Requests
│   ├── Safe Arrivals
│   ├── Going Home Alerts
│   ├── Event Updates
│   └── Squad Invites
└── Legal & About

📱 PUSH NOTIFICATIONS
├── Bar Hop: Moving to Next Stop
├── Ride: Someone Offered a Ride
├── Ride: Request Approved/Declined
├── Home: Friend Heading Home
├── Home: Friend Arrived Safe
└── Event: Location Changed
    `;

    const blob = new Blob([flowchartText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rally-app-flowchart.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Flowchart downloaded!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b print:hidden">
        <div className="container flex items-center justify-between h-14">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          
          <h1 className="font-montserrat font-bold">App Flowchart</h1>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="container py-4 flex gap-3 print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      {/* Flowchart Content */}
      <div 
        className="container pb-8 overflow-auto"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        ref={contentRef}
      >
        <div className="space-y-6 max-w-4xl">
          {/* Authentication */}
          <Card>
            <CardHeader className="bg-blue-500/10">
              <CardTitle className="flex items-center gap-2">🔐 Authentication</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-blue-500 space-y-2 text-sm">
                <p>App Launch → Check Login Status</p>
                <p className="pl-4">├── Not Logged In → Auth Page</p>
                <p className="pl-8">├── Email/Password Login</p>
                <p className="pl-8">├── Google OAuth</p>
                <p className="pl-8">└── Forgot Password → Reset Email</p>
                <p className="pl-4">└── Logged In → Main App</p>
              </div>
            </CardContent>
          </Card>

          {/* Squad Management */}
          <Card>
            <CardHeader className="bg-purple-500/10">
              <CardTitle className="flex items-center gap-2">👥 Squad Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-purple-500 space-y-2 text-sm">
                <p><strong>Independent of Events</strong></p>
                <p>├── View My Squads</p>
                <p>├── Create New Squad</p>
                <p className="pl-4">├── Name Squad</p>
                <p className="pl-4">└── Select Members</p>
                <p>├── Invite Friends (Email/SMS)</p>
                <p className="pl-4">├── Send Email Invite</p>
                <p className="pl-4">├── Send SMS Invite</p>
                <p className="pl-4">└── Copy Invite Link</p>
                <p>└── Quick Rally from Squad</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Rally */}
          <Card>
            <CardHeader className="bg-yellow-500/10">
              <CardTitle className="flex items-center gap-2">⚡ Quick R@lly</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-yellow-500 space-y-2 text-sm">
                <p>Quick R@lly Dialog</p>
                <p>├── Enter Title & Location</p>
                <p>├── Enable Bar Hop? (Optional)</p>
                <p>├── Select Squad to Invite (Optional)</p>
                <p>├── Rally Starts NOW</p>
                <p>├── 🎉 Confetti Celebration!</p>
                <p>└── Share Invite Code</p>
              </div>
            </CardContent>
          </Card>

          {/* Live Event Features */}
          <Card>
            <CardHeader className="bg-green-500/10">
              <CardTitle className="flex items-center gap-2">🎉 Live Event Features</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="pl-4 border-l-2 border-green-500 space-y-2 text-sm">
                  <p><strong>Always Available:</strong></p>
                  <p>├── 💬 Event Chat</p>
                  <p>├── 📍 Live Tracking</p>
                  <p>├── 🚗 R@lly Ride</p>
                  <p>└── 🏠 R@lly Home</p>
                </div>
                <div className="pl-4 border-l-2 border-green-500 space-y-2 text-sm">
                  <p><strong>Host/Cohost Only:</strong></p>
                  <p>├── Toggle Bar Hop Mode</p>
                  <p>├── Add Co-hosts</p>
                  <p>├── Manage Bar Hop Stops</p>
                  <p>└── Move to Next Stop</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Hop Mode */}
          <Card>
            <CardHeader className="bg-orange-500/10">
              <CardTitle className="flex items-center gap-2">🍺 Bar Hop Mode</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-orange-500 space-y-2 text-sm">
                <p>Enable Bar Hop (Anytime during event)</p>
                <p>├── Add Stops</p>
                <p className="pl-4">├── Name & Address</p>
                <p className="pl-4">├── Set ETA</p>
                <p className="pl-4">├── Reorder Stops</p>
                <p className="pl-4">└── Remove Stops</p>
                <p>├── View Stops on Map</p>
                <p>├── Host: Arrive at Stop</p>
                <p>├── Host: Move to Next Stop</p>
                <p className="pl-4">└── 📢 Push Notification to All</p>
                <p>└── 🎉 Bar Hop Complete!</p>
              </div>
            </CardContent>
          </Card>

          {/* R@lly Ride */}
          <Card>
            <CardHeader className="bg-blue-500/10">
              <CardTitle className="flex items-center gap-2">🚗 R@lly Ride</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-blue-500 space-y-2 text-sm">
                <p>View Available Rides</p>
                <p>├── Offer a Ride (DD Mode)</p>
                <p className="pl-4">├── Set Pickup Location</p>
                <p className="pl-4">├── Set Destination</p>
                <p className="pl-4">└── Set Available Seats</p>
                <p>├── Request a Seat</p>
                <p>├── Driver Approves/Declines</p>
                <p className="pl-4">└── 📢 Push Notification</p>
                <p>└── Ride Confirmed</p>
              </div>
            </CardContent>
          </Card>

          {/* R@lly Home */}
          <Card>
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center gap-2">🏠 R@lly Home</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="pl-4 border-l-2 border-primary space-y-2 text-sm">
                <p>Select Destination</p>
                <p className="pl-4">├── Home Address</p>
                <p className="pl-4">├── Friend's House</p>
                <p className="pl-4">├── Hotel</p>
                <p className="pl-4">└── Custom Address</p>
                <p>├── Start Navigation</p>
                <p>├── 📢 Squad Notified: Heading Home</p>
                <p>├── Track on Going Home List</p>
                <p>├── I've Arrived Safely</p>
                <p>├── ✅ Marked Safe</p>
                <p>└── 📢 Squad Notified: Arrived Safe</p>
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader className="bg-red-500/10">
              <CardTitle className="flex items-center gap-2">📱 Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="pl-4 border-l-2 border-red-500 space-y-2 text-sm">
                  <p><strong>Bar Hop:</strong></p>
                  <p>└── Moving to Next Stop</p>
                  <p><strong>Rides:</strong></p>
                  <p>├── Someone Offered a Ride</p>
                  <p>└── Request Approved/Declined</p>
                </div>
                <div className="pl-4 border-l-2 border-red-500 space-y-2 text-sm">
                  <p><strong>Safety:</strong></p>
                  <p>├── Friend Heading Home</p>
                  <p>└── Friend Arrived Safe</p>
                  <p><strong>Events:</strong></p>
                  <p>└── Location Changed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
