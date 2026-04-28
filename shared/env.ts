const env = typeof window === "undefined" ? process.env : window.env;

export default env as Record<string, any>;
