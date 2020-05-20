/* eslint-disable flowtype/require-valid-file-annotation */
import Abstract from './Abstract';

describe('Abstract', () => {
  const match = Abstract.ENABLED[0];
  const match2 = Abstract.ENABLED[1];
  test('to be enabled on share subdomain link', () => {
    expect(
      'https://share.goabstract.com/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match
      )
    ).toBeTruthy();

    expect(
      'https://share.abstract.com/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match
      )
    ).toBeTruthy();
  });

  test('to be enabled on share link', () => {
    expect(
      'https://app.goabstract.com/share/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match2
      )
    ).toBeTruthy();

    expect(
      'https://app.abstract.com/share/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match2
      )
    ).toBeTruthy();
  });

  test('to be enabled on embed link', () => {
    expect(
      'https://app.goabstract.com/embed/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match2
      )
    ).toBeTruthy();
    expect(
      'https://app.abstract.com/embed/aaec8bba-f473-4f64-96e7-bff41c70ff8a'.match(
        match2
      )
    ).toBeTruthy();
  });

  test('to not be enabled elsewhere', () => {
    expect('https://abstract.com'.match(match)).toBe(null);
    expect('https://goabstract.com'.match(match)).toBe(null);
    expect('https://app.goabstract.com'.match(match)).toBe(null);
    expect('https://abstract.com/features'.match(match)).toBe(null);
    expect('https://app.abstract.com/home'.match(match)).toBe(null);
    expect('https://abstract.com/pricing'.match(match)).toBe(null);
    expect('https://goabstract.com/pricing'.match(match)).toBe(null);
    expect('https://www.goabstract.com/pricing'.match(match)).toBe(null);
  });
});
