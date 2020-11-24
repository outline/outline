/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleSheets from "./GoogleSheets";

describe("GoogleSheets", () => {
  const match = GoogleSheets.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTdddHPoZ5M_47wmSHCoigRIt2cj_Pd-kgtaNQY6H0Jzn0_CVGbxC1GcK5IoNzU615lzguexFwxasAW/pub".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTdddHPoZ5M_47wmSHCoigR/edit".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://docs.google.com/spreadsheets".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
