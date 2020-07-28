/* eslint-disable flowtype/require-valid-file-annotation */
import Lucidchart from "./Lucidchart";

describe("Lucidchart", () => {
  const match = Lucidchart.ENABLED[0];
  test("to be enabled on view link", () => {
    expect(
      "https://www.lucidchart.com/documents/view/2f4a79cb-7637-433d-8ffb-27cce65a05e7".match(
        match
      )
    ).toBeTruthy();
  });

  test("to be enabled on visited link", () => {
    expect(
      "https://www.lucidchart.com/documents/view/2f4a79cb-7637-433d-8ffb-27cce65a05e7/0".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://lucidchart.com".match(match)).toBe(null);
    expect("https://www.lucidchart.com".match(match)).toBe(null);
    expect("https://www.lucidchart.com/features".match(match)).toBe(null);
    expect("https://www.lucidchart.com/documents/view".match(match)).toBe(null);
  });
});
