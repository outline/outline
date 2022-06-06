import env from "../env";
import { parseDomain } from "./domains";

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}

// TODO: HACK: if this is called server-side, it will always return false.
// - The only call sites to this function and isExternalUrl are on the client
//   - The reason this is in a shared util is because it's used in an editor plugin
//     which is also in the shared code
export function isInternalUrl(href: string) {
  // empty strings are never internal
  if (href === "") {
    return false;
  }

  // relative paths are always internal
  if (href[0] === "/") {
    return true;
  }

  const outline =
    typeof window !== "undefined"
      ? parseDomain(window.location.href)
      : undefined;

  const domain = parseDomain(href);
  return outline?.host === domain.host;
}

export function isExternalUrl(href: string) {
  return !isInternalUrl(href);
}
