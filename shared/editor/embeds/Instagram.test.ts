import Instagram from "./Instagram";

describe("Instagram", () => {
  const match = Instagram.ENABLED[0];

  test("to be enabled on post link", () => {
    expect(
      "https://www.instagram.com/p/CrL74G6Bxgw/?utm_source=ig_web_copy_link".match(
        match
      )
    ).toBeTruthy();
  });

  test("to be enabled on reel link", () => {
    expect(
      "https://www.instagram.com/reel/Cxdyt_fMnwN/?utm_source=ig_web_copy_link".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://www.instagram.com".match(match)).toBe(null);
    expect("https://www.instagram.com/reel/".match(match)).toBe(null);
    expect("https://www.instagram.com/p/".match(match)).toBe(null);
  });
});
