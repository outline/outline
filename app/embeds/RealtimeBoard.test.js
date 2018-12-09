/* eslint-disable flowtype/require-valid-file-annotation */
import embeds from '.';

const { RealtimeBoard } = embeds;

describe('RealtimeBoard', () => {
  const match = RealtimeBoard.ENABLED[0];
  test('to be enabled on share link', () => {
    expect(
      'https://realtimeboard.com/app/board/o9J_k0fwiss='.match(match)
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://realtimeboard.com'.match(match)).toBe(null);
    expect('https://realtimeboard.com/features'.match(match)).toBe(null);
  });
});
