import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myliqour.com',
  appName: 'Cheers Lounge',
  webDir: 'dist',

  server: {
    url: 'https://tapflow-one.vercel.app',
    cleartext: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;