import sharedEnv from "../env";

/**
 * Parse the likely document identifier from a given url.
 *
 * @param url The url to parse.
 * @returns A document identifier or undefined if not found.
 */
export default function parseDocumentSlug(url: string) {
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
  const indexOfDoc = split.indexOf("doc");
  return split[indexOfDoc + 1] ?? undefined;
}
