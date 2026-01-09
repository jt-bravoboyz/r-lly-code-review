import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bravoboyz.rally',
  appName: 'Rally',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
