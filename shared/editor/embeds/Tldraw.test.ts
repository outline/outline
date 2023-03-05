import Tldraw from "./Tldraw";

describe("Tldraw", () => {
  const match = Tldraw.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://beta.tldraw.com/r/v2_c_r5WVtGaktE99D3wyFFsoL".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://wwww.tldraw.com/r/c9d837d74182317".match(match)).toBe(null);
    expect("https://wwwwtldraw.com/r/c9d837d74182317".match(match)).toBe(null);
    expect("https://www.tldrawwcom/r/c9d837d74182317".match(match)).toBe(null);
  });
});
