import sharedEnv from "../env";
/**
 * Parse the likely notebook identifier from a given url.
 *
 * @param url The url to parse.
 * @returns A notebook identifier or undefined if not found.
 */
export default function parseNotebookSlug(url: string) {
  let parsed;
  if (url[0] === "/") {
    url = `${sharedEnv.URL}${url}`;
  }
  try {
    parsed = new URL(url).pathname;
  } catch (_err) {
    return;
  }
  const split = parsed.split("/");
  const indexOfNotebook = split.indexOf("notebook");
  const indexOfLegacyCollection = split.indexOf("collection");
  const indexOfLegacyCollections = split.indexOf("collections");
  const index =
    indexOfNotebook >= 0
      ? indexOfNotebook
      : indexOfLegacyCollection >= 0
        ? indexOfLegacyCollection
        : indexOfLegacyCollections;
  return index >= 0 ? (split[index + 1] ?? undefined) : undefined;
}
