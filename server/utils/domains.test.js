/* eslint-disable flowtype/require-valid-file-annotation */
import { stripSubdomain } from './domains';

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
