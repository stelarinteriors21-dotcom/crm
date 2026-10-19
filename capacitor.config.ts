import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stelar.telecrm',
  appName: 'Stelar CRM',
  webDir: 'public',
  server: {
    url: 'https://bullet-lounge-ccd-tri.trycloudflare.com',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
