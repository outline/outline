/* eslint-disable flowtype/require-valid-file-annotation */
import parseLinks from './parseLinks';

it('should return an array of document links', () => {
  expect(parseLinks(`# Header`).length).toBe(0);
  expect(
    parseLinks(`# Header
  
  [title](/doc/test)
  `)[0]
  ).toBe('/doc/test');
});

it('should not return non document links', () => {
  expect(parseLinks(`[title](http://www.google.com)`).length).toBe(0);
});

it('should not return non document relative links', () => {
  expect(parseLinks(`[title](/developers)`).length).toBe(0);
});
