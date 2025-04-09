import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.petraglia',
  appName: 'Vitale',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidSplashImageUrl: 'assets/splash.png',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#999999',
      androidTheme: '@style/Theme.AppCompat.Light.NoActionBar'
    },
    App: {
      ios: {
        appUrlScheme: 'com.petraglia',
        appDomain: 'localhost',
        appPath: '/'
      }
    }
  }
};

export default config;
