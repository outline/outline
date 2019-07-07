/* eslint-disable flowtype/require-valid-file-annotation */
import parseDocumentIds from './parseDocumentIds';

it('should return an array of document ids', () => {
  expect(parseDocumentIds(`# Header`).length).toBe(0);
  expect(
    parseDocumentIds(`# Header
  
  [title](/doc/test-456733)
  `)[0]
  ).toBe('test-456733');
});

it('should not return non document links', () => {
  expect(parseDocumentIds(`[title](http://www.google.com)`).length).toBe(0);
});

it('should not return non document relative links', () => {
  expect(parseDocumentIds(`[title](/developers)`).length).toBe(0);
});
