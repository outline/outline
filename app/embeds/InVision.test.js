/* eslint-disable flowtype/require-valid-file-annotation */
import InVision from "./InVision";

describe("InVision", () => {
  const match = InVision.ENABLED[0];
  test("to be enabled on shortlink", () => {
    expect("https://invis.io/69PG07QYQTE".match(match)).toBeTruthy();
  });

  test("to be enabled on share", () => {
    expect(
      "https://projects.invisionapp.com/share/69PG07QYQTE".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://invis.io".match(match)).toBe(null);
    expect("https://invisionapp.com".match(match)).toBe(null);
    expect("https://projects.invisionapp.com".match(match)).toBe(null);
  });
});
