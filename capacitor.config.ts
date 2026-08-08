interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    allowMixedContent?: boolean;
    [key: string]: any;
  };
  android?: {
    allowMixedContent?: boolean;
    webContentsDebuggingEnabled?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

const config: CapacitorConfig = {
  appId: 'com.digigold.app',
  appName: 'DigiGold',
  webDir: 'dist',
  server: {
    url: 'https://digi-gold-react.vercel.app',
    cleartext: true,
    allowMixedContent: true,
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};


export default config;
