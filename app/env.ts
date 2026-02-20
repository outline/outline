declare global {
  interface Window {
    env: Record<string, any>;
  }
}

if (!window.env) {
  throw new Error(
    "Config could not be parsed. \nSee: https://docs.getoutline.com/s/hosting/doc/troubleshooting-HXckrzCqDJ#h-config-could-not-be-parsed"
  );
}

const env: Record<string, any> & {
  isDevelopment: boolean;
  isTest: boolean;
  isProduction: boolean;
} = {
  ...window.env,
  isDevelopment: window.env.ENVIRONMENT === "development",
  isTest: window.env.ENVIRONMENT === "test",
  isProduction: window.env.ENVIRONMENT === "production",
};

export default env;
