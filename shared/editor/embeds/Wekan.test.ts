import Wekan from "./Wekan";

describe("Wekan", () => {
  const match = Wekan.ENABLED[0];

  test("to be enabled on valid board link", () => {
    expect(
      "https://boards.wekan.com/b/8PaGjBSTpxF4nzxDQ/aaa".match(
        match
      )
    ).toBeTruthy();
  });
  test("to be enabled on valid http board link", () => {
    expect(
      "http://boards.wekan.com/b/board/12345".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://google.com/test".match(match)).toBe(null);
  });
});
