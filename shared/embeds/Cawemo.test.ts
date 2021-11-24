import Cawemo from "./Cawemo";

describe("Cawemo", () => {
  const match = Cawemo.ENABLED[0];

  test("to be enabled on embed link", () => {
    expect(
      "https://cawemo.com/embed/a82e9f22-e283-4253-8d11".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on share link", () => {
    expect(
      "https://cawemo.com/embed/a82e9f22-e283-4253-8d11".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://cawemo.com/".match(match)).toBe(null);
    expect("https://cawemo.com/diagrams".match(match)).toBe(null);
  });
});
