/* eslint-disable flowtype/require-valid-file-annotation */
import Airtable from './Airtable';

describe('Airtable', () => {
  const match = Airtable.ENABLED[0];
  test('to be enabled on share link', () => {
    expect('https://airtable.com/shrEoQs3erLnppMie'.match(match)).toBeTruthy();
  });

  test('to be enabled on embed link', () => {
    expect(
      'https://airtable.com/embed/shrEoQs3erLnppMie'.match(match)
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://airtable.com'.match(match)).toBe(null);
    expect('https://airtable.com/features'.match(match)).toBe(null);
    expect('https://airtable.com/pricing'.match(match)).toBe(null);
  });
});
