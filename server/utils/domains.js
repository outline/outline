// @flow
import parseDomain from 'parse-domain';

export function stripSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);
  if (!parsed) return hostname;

  if (parsed.tld) return `${parsed.domain}.${parsed.tld}`;
  return parsed.domain;
}

export const RESERVED_SUBDOMAINS = [
  'admin',
  'api',
  'beta',
  'blog',
  'cdn',
  'community',
  'developer',
  'forum',
  'help',
  'imap',
  'localhost',
  'mail',
  'ns1',
  'ns2',
  'ns3',
  'ns4',
  'smtp',
  'support',
  'status',
  'static',
  'test',
  'www',
];
