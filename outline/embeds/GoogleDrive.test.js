/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleDrive from "./GoogleDrive";

describe("GoogleDrive", () => {
  const match = GoogleDrive.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/view?usp=sharing".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/preview?usp=sharing".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/view".match(
        match
      )
    ).toBe(null);
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/preview".match(
        match
      )
    ).toBe(null);
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/view?usp=restricted".match(
        match
      )
    ).toBe(null);
    expect("https://drive.google.com/file".match(match)).toBe(null);
    expect("https://drive.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
