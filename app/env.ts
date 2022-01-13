import { PublicEnv } from "../shared/types";

declare global {
  interface Window {
    env: PublicEnv;
  }
}

const env = window.env;

export default env;
