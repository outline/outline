/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleSites from "./GoogleSites";

describe("GoogleSites", () => {
  const match = GoogleSites.ENABLED[0];
  test("to be enabled on share link", () => {
    expect("https://sites.google.com/outline/home".match(match)).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://sites.google.com/outline".match(match)).toBe(null);
    expect("https://sites.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
