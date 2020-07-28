/* eslint-disable flowtype/require-valid-file-annotation */
import Marvel from "./Marvel";

describe("Marvel", () => {
  const match = Marvel.ENABLED[0];
  test("to be enabled on share link", () => {
    expect("https://marvelapp.com/75hj91".match(match)).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://marvelapp.com".match(match)).toBe(null);
    expect("https://marvelapp.com/features".match(match)).toBe(null);
  });
});
