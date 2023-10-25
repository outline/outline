import Pinterest from "./Pinterest";

describe("Pinterest", () => {
  const match = Pinterest.ENABLED[0];

  test("to be enabled on pin link", () => {
    expect(
      "https://in.pinterest.com/pin/1007047166659440507/".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://in.pinterest.com".match(match)).toBe(null);
    expect("https://in.pinterest.com/".match(match)).toBe(null);
    expect("https://in.pinterest.com/pin".match(match)).toBe(null);
    expect("https://pin.it/".match(match)).toBe(null);
  });
});
