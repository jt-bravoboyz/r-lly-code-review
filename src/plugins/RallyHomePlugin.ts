// RallyHomePlugin.ts
// TypeScript interface for the native RallyHomePlugin Capacitor plugin.
// The web fallback is a no-op so the React code works in Lovable preview too.

import { registerPlugin } from '@capacitor/core';

export interface RallyHomePluginInterface {
  isLiveActivitySupported(): Promise<{ supported: boolean }>;

  startLiveActivity(options: {
    eventId: string;
    eventName: string;
    attendeeCount: number;
  }): Promise<{ activityId: string }>;

  updateToBarHop(options: {
    eventName: string;
    currentStopNumber: number;
    totalStops: number;
    nextStopName?: string;
  }): Promise<void>;

  updateToHeadingHome(options: {
    eventName: string;
    destinationName?: string;
  }): Promise<void>;

  endLiveActivity(): Promise<void>;
}

// Web stubs — no-ops so the app compiles and runs in the browser/Lovable.
const RallyHomePlugin = registerPlugin<RallyHomePluginInterface>('RallyHomePlugin', {
  web: {
    isLiveActivitySupported: async () => ({ supported: false }),
    startLiveActivity:       async () => ({ activityId: 'web-stub' }),
    updateToBarHop:          async () => {},
    updateToHeadingHome:     async () => {},
    endLiveActivity:         async () => {},
  },
});

export default RallyHomePlugin;
