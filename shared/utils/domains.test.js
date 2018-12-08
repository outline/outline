/* eslint-disable flowtype/require-valid-file-annotation */
import { stripSubdomain, isCustomSubdomain } from './domains';

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
