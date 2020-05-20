/* eslint-disable flowtype/require-valid-file-annotation */
import Typeform from './Typeform';

describe('Typeform', () => {
  const match = Typeform.ENABLED[0];
  test('to be enabled on share link', () => {
    expect(
      'https://beardyman.typeform.com/to/zvlr4L'.match(match)
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://www.typeform.com'.match(match)).toBe(null);
    expect('https://typeform.com/to/zvlr4L'.match(match)).toBe(null);
    expect('https://typeform.com/features'.match(match)).toBe(null);
  });
});
