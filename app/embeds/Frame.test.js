/* eslint-disable flowtype/require-valid-file-annotation */
import Frame from "./Frame";

describe("GoogleDocs", () => {
  const match = Frame.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/document/d/e/2PACX-1vTdddHPoZ5M_47wmSHCoigRIt2cj_Pd-kgtaNQY6H0Jzn0_CVGbxC1GcK5IoNzU615lzguexFwxasAW/pubhtml".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("".match(match)).toBe(null);
  });
});
