import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easonchiang.medscirunner',
  appName: 'Medsci Runner',
  webDir: 'www',
  plugins: {
    // Google-only for now (Apple sign-in deferred, per earlier decision) --
    // this plugin requires each sign-in provider to be listed explicitly,
    // it doesn't infer them from what's enabled in the Firebase console.
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
};

export default config;
