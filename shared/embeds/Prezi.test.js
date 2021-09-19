/* eslint-disable flowtype/require-valid-file-annotation */
import Prezi from "./Prezi";

describe("Prezi", () => {
  const match = Prezi.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://prezi.com/view/39mn8Rn1ZkoeEKQCgk5C".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect(
      "https://prezi.com/view/39mn8Rn1ZkoeEKQCgk5C/embed".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://prezi.com".match(match)).toBe(null);
    expect("https://prezi.com/pricing".match(match)).toBe(null);
  });
});
