// @flow
import parseDomain from 'parse-domain';

export default function isInternalUrl(href: string) {
  if (href[0] === '/') return true;

  const outline = parseDomain(BASE_URL);
  const parsed = parseDomain(href);
  if (
    parsed &&
    outline &&
    parsed.domain === outline.domain &&
    parsed.tld === outline.tld
  ) {
    return true;
  }

  return false;
}
