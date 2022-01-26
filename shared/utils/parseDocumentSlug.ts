export default function parseDocumentSlug(url: string) {
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

  return parsed.lastIndexOf("/doc/") === 0
    ? parsed.replace(/^\/doc\//, "")
    : null;
}
