import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myliqour.com',
  appName: 'My Liquorstore',
  webDir: 'dist',

  server: {
    url: 'https://tap-flow.vercel.app',
    cleartext: true
  }
};

export default config;