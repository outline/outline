/* eslint-disable flowtype/require-valid-file-annotation */
import BambooHR from "./BambooHR";

describe("BambooHR", () => {
  const match = BambooHR.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://outline.bamboohr.com/anytime/directory.php".match(match)
    ).toBeTruthy();
    expect(
      "https://outline.bamboohr.com/employees/orgchart.php".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://outline.bamboohr.com/".match(match)).toBe(null);
    expect("https://bamboohr.com/".match(match)).toBe(null);
  });
});
