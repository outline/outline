/* eslint-disable flowtype/require-valid-file-annotation */
import Miro from "./Miro";

describe("Miro", () => {
  const match = Miro.ENABLED[0];
  test("to be enabled on old domain share link", () => {
    expect(
      "https://realtimeboard.com/app/board/o9J_k0fwiss=".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on share link", () => {
    expect("https://miro.com/app/board/o9J_k0fwiss=".match(match)).toBeTruthy();
  });

  test("to extract the domain as part of the match for later use", () => {
    expect(
      "https://realtimeboard.com/app/board/o9J_k0fwiss=".match(match)[1]
    ).toBe("realtimeboard");
  });

  test("to not be enabled elsewhere", () => {
    expect("https://miro.com".match(match)).toBe(null);
    expect("https://realtimeboard.com".match(match)).toBe(null);
    expect("https://realtimeboard.com/features".match(match)).toBe(null);
  });
});
