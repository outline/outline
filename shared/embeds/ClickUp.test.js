/* eslint-disable flowtype/require-valid-file-annotation */
import ClickUp from "./ClickUp";

describe("ClickUp", () => {
  const match = ClickUp.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://share.clickup.com/b/h/6-9310960-2/c9d837d74182317".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://share.clickup.com".match(match)).toBe(null);
    expect("https://clickup.com/".match(match)).toBe(null);
    expect("https://clickup.com/features".match(match)).toBe(null);
  });
});
