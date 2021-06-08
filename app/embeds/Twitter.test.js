/* eslint-disable flowtype/require-valid-file-annotation */
import Twitter from "./Twitter";

describe("Twitter", () => {
  const match = Twitter.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://twitter.com/Twitter/status/1398341197047939073".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://twitter.com/Twitter/".match(match)).toBe(null);
    expect("https://twitter.com/".match(match)).toBe(null);
  });
});
