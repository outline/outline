// @flow
import parseDomain from 'parse-domain';

export function stripSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);
  if (!parsed) return hostname;

  if (parsed.tld) return `${parsed.domain}.${parsed.tld}`;
  return parsed.domain;
}

export const RESERVED_SUBDOMAINS = [
  'about',
  'account',
  'admin',
  'advertising',
  'api',
  'assets',
  'archive',
  'beta',
  'billing',
  'blog',
  'cache',
  'cdn',
  'code',
  'community',
  'dashboard',
  'developer',
  'developers',
  'forum',
  'help',
  'home',
  'http',
  'https',
  'imap',
  'localhost',
  'mail',
  'mobile',
  'news',
  'newsletter',
  'ns1',
  'ns2',
  'ns3',
  'ns4',
  'password',
  'profile',
  'sandbox',
  'script',
  'scripts',
  'setup',
  'signin',
  'signup',
  'smtp',
  'support',
  'status',
  'static',
  'stats',
  'test',
  'update',
  'updates',
  'www',
  'www1',
  'www2',
  'www3',
  'www4',
];
