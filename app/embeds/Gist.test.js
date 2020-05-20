/* eslint-disable flowtype/require-valid-file-annotation */
import Gist from './Gist';

describe('Gist', () => {
  const match = Gist.ENABLED[0];
  test('to be enabled on gist link', () => {
    expect(
      'https://gist.github.com/wmertens/0b4fd66ca7055fd290ecc4b9d95271a9'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://gist.github.com/tommoor'.match(match)).toBe(null);
  });
});
