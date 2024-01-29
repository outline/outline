import { PublicEnv } from "../shared/types";

declare global {
  interface Window {
    env: PublicEnv;
  }
}

const env = window.env;

if (!env) {
  throw new Error(
    "Config could not be be parsed. \nSee: https://docs.getoutline.com/s/hosting/doc/troubleshooting-HXckrzCqDJ#h-config-could-not-be-parsed"
  );
}

export default env;
