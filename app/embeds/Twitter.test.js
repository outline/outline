/* eslint-disable flowtype/require-valid-file-annotation */
import Twitter from "./Twitter";

describe("Twitter", () => {
  const match = Twitter.ENABLED[0];

  test("to be enabled for profile link", () => {
    expect("https://twitter.com/outlinewiki".match(match)).toBeTruthy();
  });

  test("to be enabled for post link", () => {
    expect(
      "https://twitter.com/outlinewiki/status/1364256279930146826".match(match)
    ).toBeTruthy();
  });

  test("to be enabled for list link", () => {
    expect(
      "https://twitter.com/TwitterDev/lists/national-parks".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://twitter.com/".match(match)).toBeFalsy();
    expect(
      "https://twitter.com/i/lists/715919216927322112".match(match)
    ).toBeFalsy();
  });
});
