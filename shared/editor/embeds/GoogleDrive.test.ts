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
    expect(
      "https://drive.google.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/preview?usp=sharing&resourceKey=BG8k4dEt1p2gisnVdlaSpA".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://drive.google.com/file".match(match)).toBe(null);
    expect("https://drive.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://driveegoogle.com/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/view?usp=sharing".match(
        match
      )
    ).toBe(null);
    expect(
      "https://drive.googleecom/file/d/1ohkOgmE8MiNx68u6ynBfYkgjeKu_x3ZK/view?usp=sharing".match(
        match
      )
    ).toBe(null);
  });
});
