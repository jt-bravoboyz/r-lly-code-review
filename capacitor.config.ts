import type { CapacitorConfig } from '@capacitor/cli';

// Opt-in only: set CAP_LIVE_RELOAD=1 to point the native app at the
// Lovable sandbox for hot-reload. Default behavior is a self-contained
// native build that loads the bundled `dist/` web assets (correct for
// Xcode / TestFlight / App Store).
const useLovableLiveReload = process.env.CAP_LIVE_RELOAD === '1';

const config: CapacitorConfig = {
  appId: 'com.bravoboyz.rally',
  appName: 'R@lly',
  webDir: 'dist',
  ...(useLovableLiveReload ? {
    server: {
      androidScheme: 'https',
      url: 'https://30a08aa7-cdeb-4250-a60c-0605f836113c.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    }
  } : {}),
  plugins: {
    SplashScreen: {
      // We hide the splash programmatically once auth resolves
      // (see src/lib/nativeBootstrap.ts) to prevent a white flash.
      launchAutoHide: false,
      backgroundColor: '#F47A19',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F47A19',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
