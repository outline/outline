import ZhiXi from "./ZhiXi";

describe("ZhiXi", () => {
  const match = ZhiXi.ENABLED[0];

  test("to not be enabled for invalid urls", () => {
    expect("https://www.zhixi.com/embed/1bb899e0".match(match)).toBe(null);
    expect("https://www.zhixi.com/view/308d9a55".match(match)).toBe(null);
  });
});
