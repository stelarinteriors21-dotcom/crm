import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telecrm.clone',
  appName: 'Stelar CRM',
  webDir: 'public',
  server: {
    url: 'https://telecrm-clone.vercel.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
