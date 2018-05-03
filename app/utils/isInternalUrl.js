// @flow
export default function isInternalUrl(href: string) {
  if (href[0] === '/') return true;

  try {
    const outline = new URL(BASE_URL);
    const parsed = new URL(href);
    return parsed.hostname === outline.hostname;
  } catch (err) {
    return false;
  }
}
