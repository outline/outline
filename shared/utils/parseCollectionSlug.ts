import sharedEnv from "../env";

/**
 * Parse the likely collection identifier from a given url.
 *
 * @param url The url to parse.
 * @returns A collection identifier or undefined if not found.
 */
export default function parseCollectionSlug(url: string) {
  let parsed;

  if (url[0] === "/") {
    url = `${sharedEnv.URL}${url}`;
  }

  try {
    parsed = new URL(url).pathname;
  } catch (err) {
    return;
  }

  const split = parsed.split("/");
  const indexOfCollection = split.indexOf("collection");
  return split[indexOfCollection + 1] ?? undefined;
}
