/* eslint-disable flowtype/require-valid-file-annotation */
import embeds from '.';

const { Numeracy } = embeds;

describe('Numeracy', () => {
  const match = Numeracy.ENABLED[0];
  test('to be enabled on share link', () => {
    expect('https://numeracy.co/outline/n8ZIVOC2OS'.match(match)).toBeTruthy();
  });

  test('to be enabled on embed link', () => {
    expect(
      'https://numeracy.co/outline/n8ZIVOC2OS.embed'.match(match)
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://numeracy.co'.match(match)).toBe(null);
    expect('https://numeracy.co/outline'.match(match)).toBe(null);
  });
});
