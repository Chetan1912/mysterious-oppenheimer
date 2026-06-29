import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apex.academy',
  appName: 'Apex Academy',
  webDir: 'out',
  server: {
    url: 'https://pb8e3ijc4p.ap-south-1.awsapprunner.com',
    cleartext: true
  }
};

export default config;
