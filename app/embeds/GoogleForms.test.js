/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleSheets from "./GoogleSheets";

describe("GoogleSheets", () => {
  const match = GoogleSheets.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/forms/d/e/1FAIpQLScv-VupAsWx5HDoKrjc7g8MxBOZSDRKOKuvfgKE6xa2XCUamw/viewform".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/forms/d/1BUCCkcdqBHKtNOBirr3J4nR5dCm6eOjdPp9I5seB2hI/viewform".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://docs.google.com/forms/d/e/1FAIpQLScv-VupAsWx5HDoKrjc7g8MxBOZSDRKOKuvfgKE6xa2XCUamw/edit".match(
        match
      )
    ).toBe(null);
    expect(
      "https://docs.google.com/forms/d/1BUCCkcdqBHKtNOBirr3J4nR5dCm6eOjdPp9I5seB2hI/edit".match(
        match
      )
    ).toBe(null);
    expect("https://docs.google.com/forms".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
