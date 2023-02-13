import ZhiXi from "./ZhiXi";

describe("ZhiXi", () => {
  const match = ZhiXi.ENABLED[0];

  test("to be enabled on view link", () => {
    expect("https://www.zhixi.com/view/308d9a55".match(match)).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect("https://www.zhixi.com/embed/1bb899e0".match(match)).toBeTruthy();
  });
});
