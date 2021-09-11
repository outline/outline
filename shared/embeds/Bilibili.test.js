/* eslint-disable flowtype/require-valid-file-annotation */
import Bilibili from "./Bilibili";

describe("Bilibili", () => {
  const match = Bilibili.ENABLED[0];
  test("to be enabled on video link", () => {
    expect(
      "https://www.bilibili.com/video/BV1CV411s7jd?spm_id_from=333.999.0.0".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://youtu.be".match(match)).toBe(null);
    expect("https://bilibili.com".match(match)).toBe(null);
    expect("https://www.bilibili.com".match(match)).toBe(null);
    expect("https://www.bilibili.com/logout".match(match)).toBe(null);
    expect("https://www.bilibili.com/feed/subscriptions".match(match)).toBe(
      null
    );
  });
});
