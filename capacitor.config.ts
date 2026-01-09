import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bravoboyz.rally',
  appName: 'Rally',
  webDir: 'dist',
  server: {
    url: 'https://30a08aa7-cdeb-4250-a60c-0605f836113c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
