import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CheckCircle2, Moon, PartyPopper, Navigation } from 'lucide-react';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mt-6 mb-2">
      {children}
    </p>
  );
}

export default function DemoRallyHome() {
  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <h1 className="font-montserrat font-bold text-lg">R@lly Home — Renderings</h1>
        <p className="text-xs text-muted-foreground">Preview of every visual state</p>
      </header>

      <div className="mx-auto max-w-md px-4 space-y-2">
        {/* 1. Entry trigger card (live event) */}
        <Label>1. Entry — Live event</Label>
        <Card className="bg-gradient-to-r from-primary to-primary/85 border-0 shadow-lg cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Home className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-primary-foreground text-lg font-montserrat">R@lly Home</h3>
                <p className="text-primary-foreground/80 text-sm font-montserrat">Let your crew know you're heading out</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. After R@lly themed entry */}
        <Label>2. Entry — After R@lly (glow)</Label>
        <Card className="bg-gradient-to-r from-primary to-primary/85 border-0 shadow-lg cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center shadow-[0_0_14px_rgba(255,255,255,0.5)] animate-[home-glow_3s_ease-in-out_infinite]">
                <Home className="h-6 w-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
              </div>
              <div>
                <h3 className="font-bold text-primary-foreground text-lg font-montserrat">R@lly Home</h3>
                <p className="text-primary-foreground/80 text-sm font-montserrat">Let your crew know you're heading out</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. I've arrived button */}
        <Label>3. In transit — "I've Arrived Safely"</Label>
        <button className="w-full rounded-full font-montserrat h-14 text-lg text-white inline-flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
          <CheckCircle2 className="h-5 w-5 mr-2" />
          I've Arrived Safely
        </button>

        {/* 4. Arrived */}
        <Label>4. Arrived state (disabled)</Label>
        <button
          disabled
          className="w-full rounded-full font-montserrat h-14 text-lg cursor-default inline-flex items-center justify-center"
          style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#15803d' }}
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Arrived Safely ✓
        </button>

        {/* 5. Destination set — start heading home */}
        <Label>5. Destination set — Start Heading Home</Label>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="font-medium">Destination: 123 Main St, Home</span>
            </div>
            <Button className="w-full bg-primary text-primary-foreground rounded-full h-12 font-montserrat font-bold">
              <Home className="h-5 w-5 mr-2" />
              Start Heading Home Now
            </Button>
          </CardContent>
        </Card>

        {/* 6. After R@lly banner */}
        <Label>6. After R@lly Mode banner</Label>
        <Card className="gradient-after-rally border-0 after-rally-pulse overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
          <CardContent className="p-5 flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Moon className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white text-xl font-montserrat">After R@lly Mode</h3>
                <PartyPopper className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-white/90 text-sm font-montserrat">
                📍 Next stop: The Continental Lounge
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 7. Inactive helper copy */}
        <Label>7. Pre-R@lly Home helper</Label>
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">R@lly Home activates when the night wraps up.</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">It activates when you hit R@lly Home or when the host ends the R@lly.</p>
        </div>
      </div>
    </div>
  );
}
