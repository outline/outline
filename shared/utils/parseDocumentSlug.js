// @flow

export function parseDocumentSlugFromUrl(url: string) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return;
  }

  return parsed.pathname.replace(/^\/doc\//, "");
}
