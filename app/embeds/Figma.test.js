/* eslint-disable flowtype/require-valid-file-annotation */
import Figma from './Figma';

describe('Figma', () => {
  const match = Figma.ENABLED[0];
  test('to be enabled on file link', () => {
    expect(
      'https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931'.match(match)
    ).toBeTruthy();
  });

  test('to be enabled on prototype link', () => {
    expect(
      'https://www.figma.com/proto/LKQ4FJ4bTnCSjedbRpk931'.match(match)
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://www.figma.com'.match(match)).toBe(null);
    expect('https://www.figma.com/features'.match(match)).toBe(null);
  });
});
