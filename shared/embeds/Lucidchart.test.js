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
  test("to be enabled on root link", () => {
    expect(
      "https://lucidchart.com/documents/view/2f4a79cb-7637-433d-8ffb-27cce65a05e7".match(
        match
      )
    ).toBeTruthy();
  });
  test("to be enabled on app link", () => {
    expect(
      "https://app.lucidchart.com/documents/view/2f4a79cb-7637-433d-8ffb-27cce65a05e7".match(
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
  test("to be enabled on embedded link", () => {
    expect(
      "https://app.lucidchart.com/documents/embeddedchart/1af2bdfa-da7d-4ea1-aa1d-bec5677a9837".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://lucidchart.com".match(match)).toBe(null);
    expect("https://app.lucidchart.com".match(match)).toBe(null);
    expect("https://www.lucidchart.com".match(match)).toBe(null);
    expect("https://www.lucidchart.com/features".match(match)).toBe(null);
    expect("https://www.lucidchart.com/documents/view".match(match)).toBe(null);
  });
});
