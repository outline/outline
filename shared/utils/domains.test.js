/* eslint-disable flowtype/require-valid-file-annotation */
import { stripSubdomain, parseDomain, isCustomSubdomain } from './domains';

// test suite is based on subset of parse-domain module we want to support
// https://github.com/peerigon/parse-domain/blob/master/test/parseDomain.test.js
describe('#parseDomain', () => {
  it('should remove the protocol', () => {
    expect(parseDomain('http://example.com')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
    expect(parseDomain('//example.com')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
    expect(parseDomain('https://example.com')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should remove sub-domains', () => {
    expect(parseDomain('www.example.com')).toMatchObject({
      subdomain: 'www',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should remove the path', () => {
    expect(parseDomain('example.com/some/path?and&query')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
    expect(parseDomain('example.com/')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should remove the query string', () => {
    expect(parseDomain('example.com?and&query')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should remove special characters', () => {
    expect(parseDomain('http://m.example.com\r')).toMatchObject({
      subdomain: 'm',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should remove the port', () => {
    expect(parseDomain('example.com:8080')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should allow @ characters in the path', () => {
    expect(parseDomain('https://medium.com/@username/')).toMatchObject({
      subdomain: '',
      domain: 'medium',
      tld: 'com',
    });
  });

  it('should also work with three-level domains like .co.uk', () => {
    expect(parseDomain('www.example.co.uk')).toMatchObject({
      subdomain: 'www',
      domain: 'example',
      tld: 'co.uk',
    });
  });

  it('should not include private domains like blogspot.com by default', () => {
    expect(parseDomain('foo.blogspot.com')).toMatchObject({
      subdomain: 'foo',
      domain: 'blogspot',
      tld: 'com',
    });
  });

  it('should also work with the minimum', () => {
    expect(parseDomain('example.com')).toMatchObject({
      subdomain: '',
      domain: 'example',
      tld: 'com',
    });
  });

  it('should return null if the given value is not a string', () => {
    expect(parseDomain(undefined)).toBe(null);
    expect(parseDomain({})).toBe(null);
    expect(parseDomain('')).toBe(null);
  });

  it('should work with custom top-level domains (eg .local)', () => {
    expect(parseDomain('mymachine.local')).toMatchObject({
      subdomain: '',
      domain: 'mymachine',
      tld: 'local',
    });
  });
});

describe('#stripSubdomain', () => {
  test('to work with localhost', () => {
    expect(stripSubdomain('localhost')).toBe('localhost');
  });
  test('to return domains without a subdomain', () => {
    expect(stripSubdomain('example')).toBe('example');
    expect(stripSubdomain('example.com')).toBe('example.com');
    expect(stripSubdomain('example.org:3000')).toBe('example.org');
  });
  test('to remove subdomains', () => {
    expect(stripSubdomain('test.example.com')).toBe('example.com');
    expect(stripSubdomain('test.example.com:3000')).toBe('example.com');
  });
});

describe('#isCustomSubdomain', () => {
  test('to work with localhost', () => {
    expect(isCustomSubdomain('localhost')).toBe(false);
  });
  test('to return false for domains without a subdomain', () => {
    expect(isCustomSubdomain('example')).toBe(false);
    expect(isCustomSubdomain('example.com')).toBe(false);
    expect(isCustomSubdomain('example.org:3000')).toBe(false);
  });
  test('to return false for www', () => {
    expect(isCustomSubdomain('www.example.com')).toBe(false);
    expect(isCustomSubdomain('www.example.com:3000')).toBe(false);
  });
  test('to return true for subdomains', () => {
    expect(isCustomSubdomain('test.example.com')).toBe(true);
    expect(isCustomSubdomain('test.example.com:3000')).toBe(true);
  });
});
