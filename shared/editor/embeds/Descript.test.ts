import Descript from "./Descript";

describe("Descript", () => {
  const match = Descript.ENABLED[0];

  test("to not be enabled elsewhere", () => {
    expect("https://shareddescript.com/view/c9d8".match(match)).toBe(null);
    expect("https://share.descriptdcom/view/c9d8".match(match)).toBe(null);
  });
});
