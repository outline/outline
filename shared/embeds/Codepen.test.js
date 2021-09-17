/* eslint-disable flowtype/require-valid-file-annotation */
import Codepen from "./Codepen";

describe("Codepen", () => {
  const match = Codepen.ENABLED[0];
  test("to be enabled on pen link", () => {
    expect(
      "https://codepen.io/chriscoyier/pen/gfdDu".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect(
      "https://codepen.io/chriscoyier/embed/gfdDu".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://codepen.io".match(match)).toBe(null);
    expect("https://codepen.io/chriscoyier".match(match)).toBe(null);
  });
});
