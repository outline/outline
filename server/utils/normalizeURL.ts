export const normalizeURL = (urlString: string): string => {
  urlString = urlString.trim();

  const hasRelativeProtocol = urlString.startsWith("//");
  const isRelativeURL = !hasRelativeProtocol && /^\.*\//.test(urlString);

  if (!isRelativeURL) {
    urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, "https://");
  }

  const urlObject = new URL(urlString);

  // Remove 'www'
  urlObject.hostname = urlObject.hostname.replace(/^www\./, "");

  // Remove trailing `/`
  const newURLString = urlObject.toString().replace(/\/$/, "");

  // Remove protocol
  const finalURL = newURLString.replace(/^(?:https?:)?\/\//, "");

  return finalURL;
};
