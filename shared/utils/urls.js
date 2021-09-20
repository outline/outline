// @flow
const env = typeof window !== "undefined" ? window.env : process.env;

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}
