import { PublicEnv } from "./types";

const env = typeof window === "undefined" ? process.env : window.env;

export default env as PublicEnv;
