/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleDriveVideo from "./GoogleDriveVideo";

describe("GoogleDriveVideo", () => {
  const match = GoogleDriveVideo.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://drive.google.com/file/d/2PACX-1vTdddHPoZ5M_47wmSHCoigRIt2cj_Pd-kgtaNQY6H0Jzn0_CVGbxC1GcK5IoNzU615lzguexFwxasAW/view".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://drive.google.com/file/d/2PACX-1vTdddHPoZ5M_47wmSHCoigR/view".match(
        match
      )
    ).toBe(null);
    expect("https://drive.google.com/file".match(match)).toBe(null);
    expect("https://drive.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
