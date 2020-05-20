/* eslint-disable flowtype/require-valid-file-annotation */
import Framer from './Framer';

describe('Framer', () => {
  const match = Framer.ENABLED[0];
  test('to be enabled on share link', () => {
    expect('https://framer.cloud/PVwJO'.match(match)).toBeTruthy();
  });

  test('to not be enabled on root', () => {
    expect('https://framer.cloud'.match(match)).toBe(null);
  });
});
