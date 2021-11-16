// @ts-expect-error ts-migrate(2339) FIXME: Property 'env' does not exist on type 'Window & ty... Remove this comment to see the full error message
const env = typeof window !== "undefined" ? window.env : process.env;

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}
