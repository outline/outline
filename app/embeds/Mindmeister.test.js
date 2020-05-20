/* eslint-disable flowtype/require-valid-file-annotation */
import Mindmeister from './Mindmeister';

describe('Mindmeister', () => {
  const match = Mindmeister.ENABLED[0];

  test('to be enabled on mm.tt link', () => {
    expect('https://mm.tt/326377934'.match(match)).toBeTruthy();
  });

  test('to be enabled on mm.tt link with token parameter', () => {
    expect('https://mm.tt/326377934?t=r9NcnTRr18'.match(match)).toBeTruthy();
  });

  test('to be enabled on embed link', () => {
    expect(
      'https://www.mindmeister.com/maps/public_map_shell/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled on public link', () => {
    expect(
      'https://www.mindmeister.com/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled without www', () => {
    expect(
      'https://mindmeister.com/326377934/paper-digital-or-online-mind-mapping'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled without slug', () => {
    expect('https://mindmeister.com/326377934'.match(match)).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://mindmeister.com'.match(match)).toBe(null);
    expect('https://www.mindmeister.com/pricing'.match(match)).toBe(null);
  });
});
