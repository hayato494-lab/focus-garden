import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusgarden.app',
  appName: 'Focus Garden',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0c1222',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#22c55e',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c1222',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#22c55e',
      sound: 'notification.wav',
    },
  },
};

export default config;

