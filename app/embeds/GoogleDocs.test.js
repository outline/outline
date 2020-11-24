/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleDocs from "./GoogleDocs";

describe("GoogleDocs", () => {
  const match = GoogleDocs.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/document/d/e/2PACX-1vTdddHPoZ5M_47wmSHCoigRIt2cj_Pd-kgtaNQY6H0Jzn0_CVGbxC1GcK5IoNzU615lzguexFwxasAW/pubhtml".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/document/d/e/2PACX-1vTdddHPoZ5M_47wmSHCoigRIt2cj_Pd-kgtaNQY6H0Jzn0_CVGbxC1GcK5IoNzU615lzguexFwxasAW/pub".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/document/d/1SsDfWzFFTjZM2LanvpyUzjKhqVQpwpTMeiPeYxhVqOg/edit".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/document/d/1SsDfWzFFTjZM2LanvpyUzjKhqVQpwpTMeiPeYxhVqOg/preview".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://docs.google.com/document".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
