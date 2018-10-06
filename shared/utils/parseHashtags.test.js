/* eslint-disable flowtype/require-valid-file-annotation */
import parseHashtags from './parseHashtags';

it('should return an empty array if no hashtags', () => {
  expect(parseHashtags(`This is a string with no hashtags`).length).toBe(0);
});

it('should parse a hashtag', () => {
  expect(parseHashtags(`This is a #hashtag`)[0]).toBe('#hashtag');
});

it('should parse multiple hashtags', () => {
  const result = parseHashtags(`This #is a #hashtag`);
  expect(result[0]).toBe('#is');
  expect(result[1]).toBe('#hashtag');
});
