const env = typeof window === "undefined" ? process.env : window.env;

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export default env as Record<string, any>;
