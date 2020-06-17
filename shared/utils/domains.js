// @flow
import { trim } from 'lodash';

type Domain = {
  tld: string,
  subdomain: string,
  domain: string,
};

// we originally used the parse-domain npm module however this includes
// a large list of possible TLD's which increase the size of the bundle
// unneccessarily for our usecase of trusted input.
export function parseDomain(url: string): ?Domain {
  if (typeof url !== 'string') return null;

  // strip extermeties and whitespace from input
  const normalizedDomain = trim(url.replace(/(https?:)?\/\//, ''));
  const parts = normalizedDomain.split('.');

  // ensure the last part only includes something that looks like a TLD
  function cleanTLD(tld = '') {
    return tld.split(/[/:?]/)[0];
  }

  // simplistic subdomain parse, we don't need to take into account subdomains
  // with "." characters as these are not valid in Outline
  if (parts.length >= 3) {
    return {
      subdomain: parts[0],
      domain: parts[1],
      tld: cleanTLD(parts.slice(2).join('.')),
    };
  }
  if (parts.length === 2) {
    return {
      subdomain: '',
      domain: parts[0],
      tld: cleanTLD(parts.slice(1).join('.')),
    };
  }

  return null;
}

export function getCookieDomain(domain: string) {
  // TODO: All the process.env parsing needs centralizing
  return process.env.SUBDOMAINS_ENABLED === 'true' ||
    process.env.SUBDOMAINS_ENABLED === true
    ? stripSubdomain(domain)
    : domain;
}

export function stripSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);
  if (!parsed) return hostname;

  if (parsed.tld) return `${parsed.domain}.${parsed.tld}`;
  return parsed.domain;
}

export function isCustomSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);
  if (!parsed) return false;
  if (!parsed.subdomain || parsed.subdomain === 'www') return false;
  return true;
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
  'marketing',
  'mobile',
  'new',
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
  'site',
  'smtp',
  'support',
  'status',
  'static',
  'stats',
  'test',
  'update',
  'updates',
  'ws',
  'wss',
  'web',
  'websockets',
  'www',
  'www1',
  'www2',
  'www3',
  'www4',
];
