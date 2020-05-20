/* eslint-disable flowtype/require-valid-file-annotation */
import Loom from './Loom';

describe('Loom', () => {
  const match = Loom.ENABLED[0];
  test('to be enabled on share link', () => {
    expect(
      'https://www.loom.com/share/55327cbb265743f39c2c442c029277e0'.match(match)
    ).toBeTruthy();
    expect(
      'https://www.useloom.com/share/55327cbb265743f39c2c442c029277e0'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled on embed link', () => {
    expect(
      'https://www.loom.com/embed/55327cbb265743f39c2c442c029277e0'.match(match)
    ).toBeTruthy();
    expect(
      'https://www.useloom.com/embed/55327cbb265743f39c2c442c029277e0'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://www.useloom.com'.match(match)).toBe(null);
    expect('https://www.useloom.com/features'.match(match)).toBe(null);
  });
});
