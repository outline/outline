// @flow

export default function parseDocumentSlugFromUrl(url: string) {
  let parsed;
  if (url[0] === "/") {
    parsed = url;
  } else {
    try {
      parsed = new URL(url).pathname;
    } catch (err) {
      return;
    }
  }

  return parsed.replace(/^\/doc\//, "");
}
